import { Router } from "express";
import { db, coursesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { incrementGlobalAi, globalCapMessage } from "../lib/global-cap";
import { getOwnedProfile } from "../lib/ownership";

const router = Router();

// Per-user chat throttle: 20 messages/hour
const CHAT_PER_USER_HOURLY = 20;
const chatLimiter = new Map<string, { count: number; resetAt: number }>();
function checkChatLimit(userId: string): boolean {
  const now = Date.now();
  const entry = chatLimiter.get(userId);
  if (!entry || entry.resetAt < now) {
    chatLimiter.set(userId, { count: 1, resetAt: now + 3600000 });
    return true;
  }
  if (entry.count >= CHAT_PER_USER_HOURLY) return false;
  entry.count++;
  return true;
}

const CHAT_SYSTEM = `You are Pathwise, a friendly and knowledgeable California community college transfer advisor. You help CC students with:
- Transfer planning (UC, CSU, CA private universities)
- IGETC and GE requirements
- TAG/TAP eligibility and filing
- Financial aid (FAFSA, California Dream Act, Cal Grants)
- Scholarship finding (including Dream Act scholarships)
- Major and career guidance
- Internship and research opportunities
- Campus programs (EOPS, Umoja, Puente, TRIO, MESA, Phi Theta Kappa)

Be concise, practical, and encouraging. Give specific actionable advice. Always recommend verifying with the student's CC counselor and assist.org for official articulation.
Do NOT make guarantees about admission, financial aid, or outcomes. Keep responses under 200 words unless a detailed explanation is needed.`;

router.post("/chat", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (!checkChatLimit(req.user.id)) {
    res.status(429).json({ error: `Chat rate limit reached (${CHAT_PER_USER_HOURLY}/hour). Please wait.` });
    return;
  }
  try {
    const { profileId, messages } = req.body as {
      profileId?: number;
      messages: Array<{ role: "user" | "assistant"; content: string }>;
    };
    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: "messages required" });
      return;
    }
    const cap = incrementGlobalAi();
    if (!cap.allowed) { res.status(429).json({ error: globalCapMessage(cap.cap) }); return; }

    let system = CHAT_SYSTEM;
    if (profileId) {
      const owner = await getOwnedProfile(profileId, req.user.id);
      if (!owner.ok) {
        res.status(owner.status).json({ error: owner.status === 403 ? "Forbidden" : "Profile not found" });
        return;
      }
      const profile = owner.profile;
      const courses = await db.select().from(coursesTable).where(eq(coursesTable.profileId, profileId));
      const completed = courses.filter(c => c.status === "completed").length;
      system += `\n\nStudent context: Name: ${profile.fullName ?? "unknown"}, College: ${profile.communityCollege ?? "CA community college"}, Major: ${profile.intendedMajor ?? "undecided"}, GPA: ${profile.currentGpa ?? "unknown"}, Career goal: ${profile.careerGoal ?? "not specified"}, Transfer timeline: ${profile.transferTimeline ?? "not set"}, Completed courses: ${completed}.`;
    }

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system,
      messages: messages.slice(-10),
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "I'm sorry, I couldn't generate a response right now.";
    res.json({ message: text });
  } catch (err) {
    req.log.error({ err }, "Error generating chat response");
    res.status(500).json({ error: "Failed to generate response" });
  }
});

export default router;
