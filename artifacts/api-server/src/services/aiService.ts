import { anthropic } from "@workspace/integrations-anthropic-ai";

const SYSTEM_PROMPT = `You are Pathwise CC, an AI-powered academic, transfer, scholarship, and career planning assistant for community college students in California.

You help students understand possible transfer and career pathways using the student profile and the application's curated dataset.

You are NOT an official academic counselor, admissions officer, financial aid officer, or legal advisor. Never guarantee admission, transfer eligibility, scholarship awards, financial aid, or employment outcomes.

When requirements are uncertain, clearly state that the student must verify with their community college counselor and the university's official transfer admissions page.

Your tone is encouraging, direct, realistic, and nonjudgmental. Always explain why a pathway is recommended, what risks exist, and what the student's clear next steps are.

When returning pathway data, respond ONLY with valid JSON — no markdown fences, no preamble, no explanation outside the JSON structure.`;

interface PathwayResult {
  type: string;
  university: string;
  compatibilityScore: number;
  whyItFits: string;
  concerns: string;
  gpaTarget: number;
  courseGaps: string[];
  transferTimeline: string;
  scholarshipOptions: string[];
  internshipRecommendations: string[];
  extracurricularRecommendations: string[];
  campusOpportunities: CampusOpportunityItem[];
  risks: string[];
  nextSteps: string[];
}

export interface CampusOpportunityItem {
  name: string;
  type: "club" | "research" | "internship" | "honor_society" | "program" | "leadership" | "community";
  description: string;
  admitProfileNote: string;
}

export interface CampusOpportunitiesResult {
  university: string;
  summary: string;
  opportunities: CampusOpportunityItem[];
  admitProfileInsights: string[];
  sources: string[];
}

export async function generatePathways(
  profileData: Record<string, unknown>,
  courses: Record<string, unknown>[],
  universities: Record<string, unknown>[],
  scholarships: Record<string, unknown>[],
  opportunities: Record<string, unknown>[]
): Promise<PathwayResult[]> {
  const prompt = `Generate exactly three transfer pathways for this community college student.

Student Profile:
${JSON.stringify(profileData, null, 2)}

Completed and In-Progress Courses:
${JSON.stringify(courses.slice(0, 20), null, 2)}

Available Universities (curated dataset — top matches shown):
${JSON.stringify(universities.slice(0, 10), null, 2)}

Available Scholarships (sample):
${JSON.stringify(scholarships.slice(0, 15), null, 2)}

Available Opportunities (sample):
${JSON.stringify(opportunities.slice(0, 10), null, 2)}

Return ONLY a JSON object with this exact structure:
{
  "pathways": [
    {
      "type": "least_compatible",
      "university": "University Name",
      "compatibilityScore": 0-100,
      "whyItFits": "explanation of why this is a match",
      "concerns": "honest assessment of concerns and gaps",
      "gpaTarget": 3.5,
      "courseGaps": ["list of missing or recommended courses"],
      "transferTimeline": "estimated timeline e.g. Fall 2026",
      "scholarshipOptions": ["relevant scholarship names from the dataset"],
      "internshipRecommendations": ["specific internship or career opportunities at this university"],
      "extracurricularRecommendations": ["clubs, activities, or campus programs to strengthen the application"],
      "campusOpportunities": [
        {
          "name": "Name of club, program, or organization",
          "type": "club|research|internship|honor_society|program|leadership|community",
          "description": "What it is and why it matters for this student",
          "admitProfileNote": "What admitted/successful students typically do in this area — based on publicly known admission context for this university"
        }
      ],
      "risks": ["specific risk factors the student should know about"],
      "nextSteps": ["numbered, actionable next steps"]
    },
    { "type": "moderately_compatible", ... },
    { "type": "most_compatible", ... }
  ]
}

For campusOpportunities, provide 4-6 specific, real-sounding opportunities at the actual named university. Base these on publicly known information about that university's clubs, research centers, honor societies, and programs. For each opportunity, include an admitProfileNote describing what successful transfer applicants or admitted students typically pursue at that type of institution (e.g., STEM research, leadership in student government, volunteering). These should feel grounded and actionable.

The three pathways must be DISTINCT universities representing different tiers of compatibility. Choose universities from the provided dataset. Do not invent admissions requirements. Do not include any text outside the JSON object.`;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 8192,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: prompt }],
      });

      const text = response.content[0].type === "text" ? response.content[0].text : "";
      const cleaned = text.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();
      const parsed = JSON.parse(cleaned) as { pathways: PathwayResult[] };

      if (!parsed.pathways || !Array.isArray(parsed.pathways) || parsed.pathways.length !== 3) {
        throw new Error("Invalid pathway structure");
      }
      return parsed.pathways;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < 2) await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
    }
  }

  throw lastError ?? new Error("Failed to generate pathways after 3 attempts");
}

export async function generateCampusOpportunities(
  universityName: string,
  system: string,
  location: string
): Promise<CampusOpportunitiesResult> {
  const prompt = `You are a knowledgeable advisor for California community college transfer students. Using your public knowledge about ${universityName} (${system}, located in ${location}), generate a comprehensive list of campus opportunities that a transfer student should know about.

Return ONLY a JSON object with this exact structure (no markdown, no preamble):
{
  "university": "${universityName}",
  "summary": "2-3 sentence overview of what makes this university's campus life relevant for transfer students",
  "opportunities": [
    {
      "name": "Exact name of club, program, research center, or organization",
      "type": "club|research|internship|honor_society|program|leadership|community",
      "description": "What it is, what the student does, and why it matters for career or academic growth",
      "admitProfileNote": "What successful applicants or admitted students in this field/interest area at this university typically have on their profiles — based on publicly known information about this institution's culture and priorities"
    }
  ],
  "admitProfileInsights": [
    "Key insight 1 about what transfer applicants to this university who succeed typically demonstrate (academics, activities, essays, etc.)",
    "Key insight 2...",
    "Key insight 3..."
  ],
  "sources": [
    "university.edu/clubs",
    "university.edu/research",
    "Any other relevant official URLs (can be approximate)"
  ]
}

Include 8-12 specific, real opportunities at ${universityName}. These should include a mix of:
- Academic clubs and honor societies relevant to common majors
- Research programs and labs (especially ones open to undergrads/transfers)
- Internship pipelines or career programs specific to this campus
- Leadership and community organizations
- Programs specifically designed for transfer students if they exist

For admitProfileNote, draw on publicly known characteristics of successful students at this type of institution — what GPA ranges, activities, and experiences are associated with success there.

Respond with only the JSON object, no explanation.`;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: prompt }],
      });

      const text = response.content[0].type === "text" ? response.content[0].text : "";
      const cleaned = text.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();
      const parsed = JSON.parse(cleaned) as CampusOpportunitiesResult;

      if (!parsed.opportunities || !Array.isArray(parsed.opportunities)) {
        throw new Error("Invalid campus opportunities structure");
      }
      return parsed;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < 2) await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
    }
  }

  throw lastError ?? new Error("Failed to generate campus opportunities");
}

export async function generateGuidebook(
  profile: Record<string, unknown>,
  selectedPathway: Record<string, unknown>,
  courses: Record<string, unknown>[],
  scholarships: Record<string, unknown>[],
  opportunities: Record<string, unknown>[]
): Promise<string> {
  const prompt = `Create a detailed pathway guidebook in Markdown for the selected pathway below.

Student Profile: ${JSON.stringify(profile, null, 2)}
Selected Pathway: ${JSON.stringify(selectedPathway, null, 2)}
Course History: ${JSON.stringify(courses.slice(0, 20), null, 2)}
Recommended Scholarships: ${JSON.stringify(scholarships.slice(0, 10), null, 2)}
Recommended Opportunities: ${JSON.stringify(opportunities.slice(0, 8), null, 2)}

The guidebook MUST include these sections with clear Markdown headings:

# Pathwise CC Guidebook — [Student Name]

## Executive Summary
## Student Profile Snapshot
## Selected Pathway Overview
## Semester-by-Semester Academic Plan (table format)
## Transfer Checklist
## Application Deadline Checklist
## Scholarship Checklist
## Campus Opportunities & Extracurriculars
## Career Preparation Roadmap
## Resume-Building Suggestions
## Monthly Action Plan (table format)
## Risk Alerts
## Advisor Meeting Checklist
## Verification Reminders

Include tables where useful. Be realistic and transparent.
End with this exact disclaimer:
> This guidebook was generated by Pathwise CC and is not a substitute for official academic advising. Verify all requirements with your community college counselor and the official transfer admissions page for your target university.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });

  return response.content[0].type === "text" ? response.content[0].text : "";
}
