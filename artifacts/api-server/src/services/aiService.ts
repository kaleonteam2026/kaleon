import { anthropic } from "@workspace/integrations-anthropic-ai";

const SYSTEM_PROMPT = `You are Pathwise CC, an AI-powered academic, transfer, scholarship, and career planning assistant exclusively for California community college students.

Your entire focus is California: California community colleges (CCCs), the University of California (UC) system, the California State University (CSU) system, and California-based private universities. All pathways, scholarships, opportunities, and advice you generate are California-specific. Never recommend out-of-state institutions unless the student has explicitly expressed interest.

You help students understand possible transfer and career pathways using the student profile and the application's curated California university dataset.

You are NOT an official academic counselor, admissions officer, financial aid officer, or legal advisor. Never guarantee admission, transfer eligibility, scholarship awards, financial aid, or employment outcomes.

When requirements are uncertain, clearly state that the student must verify with their California community college counselor and the university's official transfer admissions page (assist.org is the authoritative source for California articulation agreements).

Your tone is encouraging, direct, realistic, and nonjudgmental. Always explain why a California pathway is recommended, what risks exist, and what the student's clear next steps are.

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
  opportunities: Record<string, unknown>[],
  locale: string = "en",
): Promise<PathwayResult[]> {
  const { localeJsonPromptSuffix } = await import("../lib/locale.js");
  const localeSuffix = localeJsonPromptSuffix(locale);
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
        system: SYSTEM_PROMPT + localeSuffix,
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
  const prompt = `You are a knowledgeable advisor for California community college transfer students. Using your public knowledge about ${universityName} (${system}, located in ${location}, California), generate a comprehensive list of on-site university opportunities that a California transfer student should know about.

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

FORMATTING RULES — follow these exactly, no exceptions:
1. Use # only for the document title (once).
2. Use ## for every major section heading — these are the only section separators.
3. Use ### for sub-headings within a section.
4. ALL checklist items must use EXACTLY this format: "- [ ] Item text" (unchecked) or "- [x] Item text" (checked). Never use dashes, asterisks, or numbered lists for checklist items.
5. For regular bullet lists (non-checklist), use "- Item" with no checkbox.
6. For numbered steps, use "1. Step" format.
7. Tables must have a header row with | Col | Col | format and a separator row like | --- | --- |.
8. Do NOT mix list formats within the same section. Pick one and be consistent.
9. Do NOT use bold (**) for entire list items — only use bold for key terms within prose.
10. Leave one blank line between sections, between paragraphs, and before/after tables and lists.

The guidebook MUST include these sections in this exact order:

# Pathwise CC Guidebook — [Student Name]

## Executive Summary

## Student Profile Snapshot

## Selected Pathway Overview

## Semester-by-Semester Academic Plan
(use a Markdown table with columns: Semester | Course | Units | Notes)

## Transfer Requirements Checklist
(use - [ ] format for every item)

## Application Deadline Checklist
(use - [ ] format for every item, include specific months where known)

## Scholarship Checklist
(use - [ ] format for every item)

## University On-Site Opportunities
(bullet list with brief description for each item — clubs, research programs, internship pipelines, honor societies, and leadership programs specific to this California university)

## Career Preparation Roadmap
Write 8-12 numbered steps that are highly specific to the student's career goal and field. Cover: skill-building at the CC level before transfer, portfolio or project work to start now, certifications to pursue, job-shadowing or informational interviews in the field, and how to position themselves as a serious candidate before they even step on the university campus.

## University Year-by-Year Success Roadmap
This is a critical section. Write a detailed numbered plan organized into four phases that the student must execute AFTER they arrive at the university. Be specific to their intended major and career goal at the selected university:

### First Semester at University
- Meeting with a departmental advisor within week 1
- Identifying the 2-3 faculty members whose research aligns with the student's interests and attending their office hours
- Joining exactly which student organizations, clubs, and honor societies in their field (name them specifically for this university)
- Academic adjustment strategies for upper-division coursework
- Setting a GPA floor and understanding the major's grade requirements for advanced courses

### First Full Year
- Applying for undergraduate research positions (name specific research centers or labs at this university)
- Attending the career center and identifying field-specific internship pipelines
- Building the first version of their professional portfolio or GitHub/LinkedIn/research profile specific to their field
- Identifying which professors to build relationships with for future letters of recommendation
- Academic honors to target (Dean's List, departmental honors programs — name any that exist at this university)

### Second Year (Junior Standing)
- Securing a meaningful internship, co-op, or research position directly relevant to the career goal
- Taking on leadership roles in student organizations or lab settings
- Attending at least one professional conference or industry event in their field
- Beginning to build an industry network: LinkedIn strategy, informational interviews, alumni outreach through the university's alumni network
- Identifying whether graduate school is part of their plan and beginning to prepare accordingly

### Final Year
- Capstone project, thesis, or senior research — how to make it outstanding and field-relevant
- Full job search or graduate school application campaign with specific timeline
- Leveraging faculty relationships for strong letters of recommendation
- Transitioning from student to professional: professional associations to join, certifications to complete, first job strategy

## Field-Specific Excellence Plan
Write a detailed, specific plan for how this student excels in their exact field (use the student's intended major and career goal from the profile and selected pathway above). Include:

### Professional Associations & Certifications
- The 2-4 most important professional associations in this student's field and what membership provides (name the actual organizations, e.g., APA for psychology, ACM/IEEE for CS, ABA for law pre-law, CFA Institute for finance)
- Field-specific certifications or credentials to pursue during or immediately after university (be specific: CompTIA for tech, Six Sigma for business operations, LCSW licensure path for social work, etc.)
- Any California-specific licensing requirements for their career path

### Portfolio & Research Excellence
- What a strong portfolio looks like for this specific field (code projects, clinical hours, published papers, design work, business plans, etc.)
- How to use the university's resources to build it (research centers, labs, studios, clinics, accelerators)
- Specific competitions, grants, or recognition programs in this field for undergraduates

### Academic Distinction
- The specific academic honors worth pursuing at this university for this major
- How to graduate with distinction, honors, or departmental recognition
- Whether an honors thesis adds value for their specific career goal

## Professional Networking Strategy
Write 8-10 numbered steps specific to building a professional network in this student's field:
- Faculty mentorship: how to approach it, what to ask, how to maintain the relationship
- Industry networking specific to this field in California (which cities, events, meetups, industry associations have presence in California for this career)
- Alumni network strategy: how to use this university's alumni network in this field
- LinkedIn and professional presence: what a strong profile looks like for this specific career
- Informational interview guide: who to contact, how to ask, what to learn
- Professional conferences and events in this field relevant to a California-based student

## Internship & Research Roadmap
Use a Markdown table with columns: Phase | Opportunity Type | Target / Where to Find It | How to Secure It
Cover at minimum: summer after first year, summer after second year, possible co-op or part-time during school, research during school, post-graduation. Make entries specific to the student's field and the California job market.

## Graduate School & Career Launch Plan
First, clearly state whether graduate school is recommended, optional, or not necessary for this student's specific career goal. Then write a numbered plan covering:
- If graduate school: timeline for GRE/professional exam prep, when to start applications, what programs in California are strongest for this field, how to build the ideal application profile during undergrad
- Letters of recommendation strategy: which 3 faculty relationships to build and why, what to ask them to speak to, when to ask
- First job strategy: where in California this career field is concentrated, what employers actively recruit from this university, how to approach the job search 6 months before graduation
- First 90 days as a professional: what distinguishes those who accelerate vs. stagnate in this field's early career

## Resume-Building Suggestions
(bullet list — make entries specific to this student's field and career goal, not generic)

## Monthly Action Plan
(use a Markdown table with columns: Month | Action Items | Priority)

## Risk Alerts
(bullet list of specific risks with brief explanation)

## Advisor Meeting Checklist
(use - [ ] format for every item)

## Verification Reminders
(use - [ ] format for every item)

End with this exact text on its own line:
> This guidebook was generated by Pathwise CC and is not a substitute for official academic advising. Verify all requirements with your community college counselor and the official transfer admissions page for your target university.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });

  return response.content[0].type === "text" ? response.content[0].text : "";
}

// ─── Academic Roadmap ─────────────────────────────────────────────────────────

export async function generateAcademicRoadmap(
  profile: Record<string, unknown>,
  selectedPathway: Record<string, unknown>,
  courses: Record<string, unknown>[],
  scholarships: Record<string, unknown>[],
  opportunities: Record<string, unknown>[]
): Promise<string> {
  const communityCollege = typeof profile.communityCollege === "string" ? profile.communityCollege : "your community college";

  const prompt = `Create a detailed Academic Roadmap & Planner in Markdown for the selected pathway below. This document is the student's complete action plan — covering both their time at community college and their full journey at the university through career launch.

Student Profile: ${JSON.stringify(profile, null, 2)}
Selected Pathway: ${JSON.stringify(selectedPathway, null, 2)}
Course History: ${JSON.stringify(courses.slice(0, 20), null, 2)}
Recommended Scholarships: ${JSON.stringify(scholarships.slice(0, 10), null, 2)}
Recommended Opportunities: ${JSON.stringify(opportunities.slice(0, 8), null, 2)}

FORMATTING RULES — follow these exactly, no exceptions:
1. Use # only for the document title (once).
2. Use ## for every major section heading — these are the only section separators.
3. Use ### for sub-headings within a section.
4. ALL checklist items must use EXACTLY this format: "- [ ] Item text" (unchecked) or "- [x] Item text" (checked). Never use dashes, asterisks, or numbered lists for checklist items.
5. For regular bullet lists (non-checklist), use "- Item" with no checkbox.
6. For numbered steps, use "1. Step" format.
7. Tables must have a header row with | Col | Col | format and a separator row like | --- | --- |.
8. Do NOT mix list formats within the same section. Pick one and be consistent.
9. Do NOT use bold (**) for entire list items — only use bold for key terms within prose.
10. Leave one blank line between sections, between paragraphs, and before/after tables and lists.

The Academic Roadmap MUST include these sections in this exact order:

# Pathwise CC Academic Roadmap — [Student Name]

## Executive Summary

## Student Profile Snapshot

## Selected Pathway Overview

## Semester-by-Semester Academic Plan
(use a Markdown table with columns: Semester | Course | Units | Notes)

## Transfer Requirements Checklist
(use - [ ] format for every item)

## Application Deadline Checklist
(use - [ ] format for every item, include specific months where known)

## Scholarship Checklist — California & Nationwide
Generate a comprehensive scholarship checklist covering BOTH:
1. California-specific scholarships: Cal Grant A/B/C, California Community Foundation, Golden State Scholars, Cal State San Marcos Transfer Merit Award, UC Transfer Scholarships, CSU systemwide scholarships, California Hispanic Scholarship Fund, any regional California scholarships relevant to the student's profile and geographic area
2. Nationwide scholarships: Jack Kent Cooke Transfer Scholarship, Gates Scholarship, Dell Scholars Program, Phi Theta Kappa scholarships, any national scholarships specific to the student's intended major and career field, first-generation student scholarships if applicable
(use - [ ] format for every item, note the award amount range and deadline month where known)

## Community College On-Site Opportunities
Generate a detailed list of opportunities available RIGHT NOW at ${communityCollege} that the student should pursue before transferring. Be specific to this exact California community college and include:
- **Honors Program**: Transfer Alliance Program (TAP) or Honors to Honors agreements with UC/CSU — name the specific program at ${communityCollege} and what it provides
- **EOPS / CARE**: Extended Opportunity Programs and Services — eligibility, benefits, and how to apply
- **TRIO / Student Support Services**: Federal TRIO programs available at ${communityCollege}
- **Transfer Center**: Name the transfer center director or program, services available, transfer admission guarantee (TAG) programs accessible
- **CalWORKs / DSPS / Veterans**: Any applicable student support programs
- **Research / Internship pipelines**: Any articulated programs, STEM pipelines, or community college-based internship programs in the student's field
- **Student government and leadership**: How to get involved and why it matters for transfer applications
- **Field-specific clubs and organizations**: Name actual clubs at ${communityCollege} relevant to the student's intended major
- **Tutoring and academic support**: Specific learning resources to use now
(bullet list with brief description for each item)

## University On-Site Opportunities
(bullet list with brief description for each item — clubs, research programs, internship pipelines, honor societies, and leadership programs specific to the target California university in the selected pathway)

## Career Preparation Roadmap
Write 8-12 numbered steps that are highly specific to the student's career goal and field. Cover: skill-building at the CC level before transfer, portfolio or project work to start now, certifications to pursue, job-shadowing or informational interviews in the field, and how to position themselves as a serious candidate before they even step on the university campus.

## University Year-by-Year Success Roadmap
Write a detailed numbered plan organized into four phases for AFTER the student arrives at the university:

### First Semester at University
- Meeting with a departmental advisor within week 1
- Identifying the 2-3 faculty members whose research aligns with the student's interests and attending their office hours
- Joining exactly which student organizations, clubs, and honor societies in their field (name them specifically for this university)
- Academic adjustment strategies for upper-division coursework
- Setting a GPA floor and understanding the major's grade requirements for advanced courses

### First Full Year
- Applying for undergraduate research positions (name specific research centers or labs at this university)
- Attending the career center and identifying field-specific internship pipelines
- Building the first version of their professional portfolio specific to their field
- Identifying which professors to build relationships with for future letters of recommendation
- Academic honors to target (Dean's List, departmental honors programs at this university)

### Second Year (Junior Standing)
- Securing a meaningful internship or research position relevant to the career goal
- Taking on leadership roles in student organizations
- Attending at least one professional conference or industry event in their field
- Beginning to build an industry network in California for their career field
- Identifying whether graduate school is part of their plan and beginning to prepare

### Final Year
- Capstone project, thesis, or senior research — how to make it outstanding and field-relevant
- Full job search or graduate school application campaign
- Leveraging faculty relationships for strong letters of recommendation
- Transitioning from student to professional

## Field-Specific Excellence Plan
Write a detailed plan for this student's exact field and career goal:

### Professional Associations & Certifications
- The 2-4 most important professional associations in this field (name them: APA, ACM/IEEE, CFA, ABA, NASW, etc.)
- Field-specific certifications to pursue (CompTIA, Six Sigma, LCSW path, CPA, etc.)
- Any California-specific licensing requirements for their career path

### Portfolio & Research Excellence
- What a strong portfolio looks like in this specific field
- How to use the university's resources to build it
- Specific undergraduate competitions or grants in this field

### Academic Distinction
- Academic honors worth pursuing at this university for this major
- How to graduate with distinction or departmental recognition
- Whether an honors thesis adds value for their career goal

## Professional Networking Strategy
Write 8-10 numbered steps for building a professional network in this field in California.

## Internship & Research Roadmap
(use a Markdown table with columns: Phase | Opportunity Type | Target / Where to Find It | How to Secure It — cover summer after first year, summer after second year, during-school research, and post-graduation)

## Graduate School & Career Launch Plan
State clearly whether graduate school is recommended, optional, or unnecessary for this career goal. Then write numbered steps covering exam prep timeline if applicable, the three faculty relationships to build for LoRs, employer recruitment pipelines from this university, and first-90-days career acceleration strategy.

## Resume-Building Suggestions
(bullet list — field-specific and career-goal-specific, not generic)

## Monthly Action Plan
(use a Markdown table with columns: Month | Action Items | Priority)

## Risk Alerts
(bullet list of specific risks with brief explanation)

## Advisor Meeting Checklist
(use - [ ] format for every item)

## Verification Reminders
(use - [ ] format for every item)

End with this exact text on its own line:
> This academic roadmap was generated by Pathwise CC and is not a substitute for official academic advising. Verify all requirements with your community college counselor and the official transfer admissions page for your target university.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });

  return response.content[0].type === "text" ? response.content[0].text : "";
}

// ─── Progress Analysis ────────────────────────────────────────────────────────

export interface ProgressEntry {
  id: number;
  entryType: string;
  title: string;
  description?: string | null;
  entryDate?: string | null;
  numericValue?: number | null;
}

export async function generateProgressAnalysis(
  profile: Record<string, unknown>,
  courses: Record<string, unknown>[],
  selectedPathway: Record<string, unknown> | null,
  progressEntries: ProgressEntry[],
  scholarships: Record<string, unknown>[],
  opportunities: Record<string, unknown>[]
): Promise<{ markdown: string; overallScore: number; summary: string }> {
  const college = typeof profile.communityCollege === "string" ? profile.communityCollege : "your community college";
  const major = typeof profile.intendedMajor === "string" ? profile.intendedMajor : "your major";
  const targetUniversity = selectedPathway ? (selectedPathway.university ?? "target university") : "no pathway selected yet";

  const gpaEntries = progressEntries.filter(e => e.entryType === "gpa_update").sort((a, b) => (a.entryDate ?? "").localeCompare(b.entryDate ?? ""));
  const latestGpa = gpaEntries.length > 0 ? gpaEntries[gpaEntries.length - 1].numericValue : null;

  const prompt = `You are a student success advisor reviewing a California community college student's live academic progress. Analyze everything below and produce a comprehensive, honest, and encouraging progress assessment.

Student Profile:
${JSON.stringify(profile, null, 2)}

Target Pathway: ${JSON.stringify(selectedPathway ?? {}, null, 2)}

All Courses (completed, in-progress, planned):
${JSON.stringify(courses.slice(0, 25), null, 2)}

Progress Log (all student updates — certifications, GPA updates, opportunities, milestones, achievements, setbacks, notes):
${JSON.stringify(progressEntries, null, 2)}

Latest GPA on record: ${latestGpa ?? profile.currentGpa ?? "not yet logged"}
Total progress entries: ${progressEntries.length}
Community College: ${college}
Intended Major: ${major}
Target University: ${String(targetUniversity)}

Scholarship data (for context): ${JSON.stringify(scholarships.slice(0, 8), null, 2)}
Opportunities data (for context): ${JSON.stringify(opportunities.slice(0, 6), null, 2)}

FORMATTING RULES — follow these exactly:
1. Use # only for the document title (once).
2. Use ## for every major section heading.
3. Use ### for sub-headings.
4. ALL checklist items: "- [ ] Item" (unchecked) or "- [x] Item" (checked, for completed items from the progress log).
5. Regular bullet lists: "- Item".
6. Numbered steps: "1. Step".
7. Tables: header row with | Col | format and separator row | --- |.
8. Leave one blank line between sections.
9. Do NOT use bold (**) for entire list items.

Return a JSON object with exactly this structure (no markdown fences, no preamble):
{
  "overallScore": <integer 0-100 representing overall trajectory strength>,
  "summary": "<2-sentence plain text summary of where the student stands right now>",
  "markdown": "<the full progress analysis in markdown — see section requirements below>"
}

The markdown field must contain these sections in this exact order:

# Progress Assessment — [Student Name]
(subtitle line: "As of [today's date in Month DD, YYYY format] · Target: [university name] · Major: [major]")

## Overall Trajectory Score
Show the score as a large visual: "**[score]/100**" followed by a one-line status label: 🟢 On Track / 🟡 Needs Attention / 🔴 At Risk (choose based on score ≥75 / ≥50 / <50). Then write 2-3 sentences explaining what the score reflects specifically about this student's logged progress.

## What You've Accomplished
A genuine, specific acknowledgment of every achievement logged in the progress entries. Reference actual entries by name. If GPA updates show an upward trend, call it out. If certifications were earned, name them. If opportunities were joined, validate why they matter for the student's specific career goal. Be specific, not generic.

## Academic Standing
Analyze the student's GPA trajectory from the progress log:
- Current/latest GPA: what it means for their target university's requirements
- GPA trend (if multiple GPA entries exist): improving / declining / stable
- Course completion status: which courses strengthen the application, which gaps remain
- IGETC completion status based on courses logged
- Whether they are on pace to meet the GPA target for ${String(targetUniversity)}

## Transfer Readiness Checklist
Based on the student's actual progress entries and courses, generate a checklist of transfer requirements with realistic checked/unchecked status:
(use - [x] for items clearly completed based on progress log, - [ ] for items not yet done)

## Opportunity & Enrichment Status
Assess the student's extracurricular and experiential profile:
- List every opportunity entry from the progress log and evaluate its strength for the target university
- Identify which opportunity types are missing relative to the roadmap recommendations (research, leadership, internship, honors, etc.)
- Give a specific opportunity gap score: Strong / Moderate / Needs Work, with explanation

## Certification & Credential Progress
- List every certification logged and assess its value for this student's career goal
- Identify the highest-priority certifications still missing for their field
- Note any California-specific credentials relevant to their career path that haven't been started

## Roadmap Comparison
Compare current status to the original roadmap goals. Use a Markdown table:
| Goal Area | Target | Current Status | Gap |
| --- | --- | --- | --- |
(include rows for: GPA, Transfer Timeline, IGETC Completion, Major Prereqs, Opportunities, Certifications, Scholarship Applications)

## Updated Priority Action Items
Based on EVERYTHING in the progress log, generate 8-12 highly specific numbered action items that are precisely calibrated to where the student is RIGHT NOW. These must be different from generic advice — they must respond directly to what's been logged, what's missing, and what's urgent given the transfer timeline.

## Momentum & Risk Assessment

### Positive Momentum
- List 3-5 specific positive trends or strengths from the progress log

### Risk Flags
- List any genuine risks: GPA concerns, missing prerequisites, timeline pressure, opportunity gaps
- For each risk, give a clear mitigation step

## Scholarship Opportunity Match
Based on the student's logged achievements and current profile, list 5-8 scholarships they are now better positioned to apply for, with a brief reason why each is a good match given their current credentials.

## Next 30 / 60 / 90 Days
Use a Markdown table with columns: Timeframe | Action | Priority | Why It Matters Now
(Give 3-4 actions per timeframe, specific to this student's current situation)

End with this exact text:
> This progress assessment was generated by Pathwise CC based on your logged updates. It is not a substitute for official academic advising. Continue logging updates to keep your assessment current.`;

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
      const parsed = JSON.parse(cleaned) as { overallScore: number; summary: string; markdown: string };

      if (typeof parsed.markdown !== "string" || typeof parsed.overallScore !== "number") {
        throw new Error("Invalid progress analysis structure");
      }

      return {
        markdown: parsed.markdown,
        overallScore: Math.max(0, Math.min(100, Math.round(parsed.overallScore))),
        summary: parsed.summary ?? "",
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < 2) await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
    }
  }

  throw lastError ?? new Error("Failed to generate progress analysis");
}

// ─── CC On-Campus Opportunities ───────────────────────────────────────────────

export interface CCOpportunityItem {
  name: string;
  type: string;
  description: string;
  howToJoin: string;
  website?: string;
  majorsServed?: string[];
}

export interface CCOpportunitiesResult {
  college: string;
  summary: string;
  programs: CCOpportunityItem[];
}

export async function generateCCOpportunities(
  collegeName: string,
  major: string,
  city: string,
): Promise<CCOpportunitiesResult> {
  const prompt = `You are an expert on California Community Colleges. Generate a comprehensive list of on-campus programs, resources, and student organizations available at ${collegeName} (located in ${city}, California) that are relevant to a student studying ${major}.

Focus EXCLUSIVELY on programs at ${collegeName} itself — not external programs or transfer-destination universities.

CATEGORIES to cover (include as many as are real/likely at this specific college):

1. HONORS & ACADEMIC EXCELLENCE
   - Phi Theta Kappa (PTK) Honor Society (all California CCCs have this)
   - College Honors Program (many CCCs have honors tracks)
   - Dean's List / President's List

2. EQUITY & SUPPORT PROGRAMS (California CC-specific)
   - EOPS (Extended Opportunity Programs & Services) — for low-income students
   - CalWORKs — for student parents receiving welfare
   - DSPS (Disabled Students Programs & Services)
   - CARE (Cooperative Agencies Resources for Education) — for single parents
   - Financial Aid Office (FAFSA/Dream Act guidance)

3. EQUITY COHORT PROGRAMS
   - Umoja Community (Black student achievement)
   - Puente Project (Latino/a student achievement)
   - TRIO Student Support Services (if the college has a TRIO grant)
   - Adelante (Latino student success program, at some CCCs)
   - MESA (Mathematics Engineering Science Achievement) — for STEM students
   - STEM Success Center

4. ACADEMIC SUPPORT
   - Learning/Tutoring Center
   - Writing Center
   - Math Center / STEM Tutoring
   - Library Research & Instruction

5. CAREER & TRANSFER RESOURCES
   - Career Center (resume help, job boards, career fairs)
   - Transfer Center (UC/CSU application support, counseling)
   - Cooperative Education / Work Experience Program
   - Job Placement Office

6. STUDENT GOVERNMENT & LEADERSHIP
   - Associated Students (ASCC / ASGC or campus equivalent)
   - Student Trustee program
   - Leadership classes / Student Leadership Academy

7. MAJOR-RELEVANT CLUBS & ORGANIZATIONS (tailored to ${major})
   - Professional clubs in the student's field
   - Cultural student organizations relevant to the major
   - Discipline-specific honor societies

8. CULTURAL & COMMUNITY ORGANIZATIONS
   - Black Student Union
   - MEChA (Movimiento Estudiantil Chicano de Aztlán)
   - LGBTQ+ Resource Center / QSA
   - Veterans Resource Center (most CA CCCs have these)
   - International Students Club

9. HEALTH & WELLNESS
   - Student Health Center
   - Mental Health / Counseling Services
   - Food Pantry / Basic Needs Center (most CA CCCs post-2020 have these)

10. ARTS, ATHLETICS & RECREATION
    - Campus athletics (if applicable to major)
    - Theater / Performing Arts (if applicable)
    - Fine Arts program events

IMPORTANT:
- Be specific to ${collegeName} where possible. If you know specific program names, use them. If unsure, use the standard California CC equivalent.
- For "website", provide the likely URL pattern (e.g. https://www.smc.edu/student-life/eops or leave blank if unsure)
- howToJoin should be practical: "Visit room A-101", "Apply at the EOPS office", "Sign up at the Activities office"
- majorsServed: list which majors this is most relevant to (use ["All majors"] if broadly applicable)
- type must be one of: honors, equity_support, equity_cohort, academic_support, career_transfer, student_gov, major_club, cultural_org, health_wellness, arts_athletics

Return ONLY a JSON object (no markdown, no code fences):
{
  "college": "${collegeName}",
  "summary": "<2-3 sentence overview of campus life and support resources at ${collegeName}, highlighting what makes this campus especially supportive for students studying ${major}>",
  "programs": [
    {
      "name": "<program name>",
      "type": "<type from the list above>",
      "description": "<1-2 sentence description of what this program does and who it's for>",
      "howToJoin": "<practical how-to-join or access instructions>",
      "website": "<URL if known, otherwise omit>",
      "majorsServed": ["<major1>", "<major2>"] or ["All majors"]
    }
  ]
}

Include 18-25 programs. Sort by relevance to ${major} first, then by importance to all students.`;

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 5000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: prompt }],
      });
      const text = response.content[0].type === "text" ? response.content[0].text : "";
      const cleaned = text.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();
      const parsed = JSON.parse(cleaned) as CCOpportunitiesResult;
      if (!Array.isArray(parsed.programs)) throw new Error("Invalid CC opportunities structure");
      return parsed;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < 2) await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
    }
  }
  throw lastError ?? new Error("Failed to generate CC opportunities");
}

// ─── Internship Matches ────────────────────────────────────────────────────────

export interface InternshipMatch {
  id: string;
  title: string;
  organization: string;
  type: "federal" | "california_state" | "research" | "private" | "nonprofit";
  category: string;
  duration: string;
  terms: string[];
  stipend: string;
  location: string;
  eligibility: string[];
  applicationDeadline: string;
  applicationUrl: string;
  whyMatches: string;
  matchScore: number;
  citizenshipRequired: boolean;
  handshakeTip?: string;
  source: string;
}

export interface InternshipMatchResult {
  summary: string;
  handshakeGuide: string;
  internships: InternshipMatch[];
}

export async function generateInternshipMatches(
  profile: Record<string, unknown>,
  courses: Record<string, unknown>[],
  selectedPathway: Record<string, unknown> | null,
  locale: string = "en",
): Promise<InternshipMatchResult> {
  const { localeJsonPromptSuffix } = await import("../lib/locale.js");
  const internshipLocaleSuffix = localeJsonPromptSuffix(locale);
  const college = typeof profile.communityCollege === "string" ? profile.communityCollege : "a California community college";
  const major = typeof profile.intendedMajor === "string" ? profile.intendedMajor : "undeclared";
  const targetUniversity = selectedPathway ? String(selectedPathway.university ?? "UC/CSU") : "UC/CSU";
  const gpa = typeof profile.currentGpa === "number" ? profile.currentGpa : null;
  const city = typeof profile.city === "string" ? profile.city : null;
  const financialNeed = typeof profile.financialNeed === "string" ? profile.financialNeed : null;
  const completedCourseNames = courses
    .filter((c) => c.status === "completed")
    .map((c) => c.courseName)
    .slice(0, 20)
    .join(", ");

  const prompt = `You are a California community college internship advisor. Generate a comprehensive, personalized internship match list for this student. Only include programs that are genuinely open to current community college students (NOT programs requiring 4-year enrollment unless explicitly noted as accepting CC students).

Student Profile:
- Community College: ${college}
- Intended Major: ${major}
- Target University for Transfer: ${targetUniversity}
- GPA: ${gpa ?? "not specified"}
- Location/City: ${city ?? "California"}
- Financial Need Level: ${financialNeed ?? "not specified"}
- Completed Courses: ${completedCourseNames || "none yet"}

INTERNSHIP SOURCES YOU MUST DRAW FROM:

═══ FEDERAL GOVERNMENT PROGRAMS (include only government-specific ones, not generic job boards) ═══
These programs are explicitly designed for government service or government-adjacent research:

• DOE Community College Internships (CCI): 10-week paid research at DOE national labs (Argonne, LBNL, Oak Ridge, SLAC, etc.); STEM majors; $600/week + travel; spring and summer terms; EXPLICITLY for CC students; usajobs.gov
• NASA Community College Aerospace Scholars (NCAS): 2-phase program; online coursework + 5-day on-site at NASA center; STEM only; stipend provided; community college students only; nasa.gov/ncas
• NIH Community College Summer Enrichment Program: research at NIH Bethesda; biomedical/health sciences; 8 weeks; $3,000 stipend + housing allowance; rising sophomores preferred; training.nih.gov
• USDA APHIS Student Career Experience Program: government agriculture/science internships; GS pay scale; pathways.usda.gov
• EPA Student Services Contractor Program: environmental science, policy, data; semester or summer; EPA.gov/careers
• NSF Research Experiences for Undergraduates (REU): university-hosted summer research; many UC campuses; $600/week + housing; open to CC students who will transfer; nsf.gov/crssprgm/reu
• Congressional Internships — CA delegation offices: work in DC or district offices; policy, research, constituent services; paid; check each CA congressmember's website (Nanette Barragán, Maxine Waters, Karen Bass, Ted Lieu, etc.)
• CA Governor's Office Internship Program: Sacramento-based; policy, communications, operations; CalOSBA; gov.ca.gov/internships
• CA State Legislature Internship — Jesse M. Unruh Institute (USC): Sacramento; paid $2,000/month; fall/spring/summer; open to any CA college student; unruh.usc.edu
• CA State Senate / Assembly Fellowships: post-graduation but note for planning
• CA Department of Public Health (CDPH) Internships: public health, epidemiology, data analysis; cdph.ca.gov
• CA Department of Finance Student Assistant: budget analysis, economics; Sacramento; jobs.ca.gov
• JPL (Jet Propulsion Laboratory) — NASA/Caltech: Pasadena; STEM; paid; summer and year-round; community college students explicitly welcomed; jpl.nasa.gov/edu/intern
• FBI Honors Internship: law, cybersecurity, analytics, STEM; Washington DC; paid; US citizenship required; summer only; fbijobs.gov
• State Department Student Intern Program: IR, political science, languages; Washington DC or overseas; unpaid but prestigious; careers.state.gov

═══ CALIFORNIA-SPECIFIC PROGRAMS ═══
• Silicon Valley Internship Program (SVIP): Bay Area tech internships for CC students; CS, engineering, business; paid; svip.org
• Greenlining Leadership Academy: Oakland; social justice, policy, nonprofit management; paid fellowship; greenlining.org
• California STEM Pathways (CSP): STEM community college students; multiple agency placements
• San Jose/Silicon Valley's Year Up: tech and business; intensive + internship; paid stipend; yearup.org
• MESA (Mathematics Engineering Science Achievement) Industry Internships: through MESA state network; STEM industries; paid; access through campus MESA center
• JPMorgan Chase's HBCU/Community College programs (CA branches): business, finance, technology; on campus + remote
• Deloitte Foundation Scholarship + Internship: accounting, finance, consulting; paid; open to CC students planning to transfer into business
• CA Department of Education — EdCORP Student Internship: education policy and administration
• Public Policy Institute of California (PPIC): research assistant positions; Sacramento/San Francisco; policy, economics, data
• Bay Area Council Economic Institute: public policy, urban planning, economics; SF Bay Area
• ACLU of California: legal, advocacy, communications; unpaid but highly competitive; summer; acluca.org
• MALDEF (Mexican American Legal Defense): legal, policy; LA and SF offices; maldef.org
• Dolores Huerta Foundation: community organizing, social justice; Bakersfield area; doloreshuerta.org

═══ RESEARCH PROGRAMS ═══
• UC LEADS (Latina/Latino Excellence and Achievement Dissertation Scholarship): STEM research at UC campuses; stipend; ucop.edu
• UC CAMP (California Alliance for Minority Participation): STEM at multiple UC campuses; research stipend; ucop.edu
• CCURI (Community College Undergraduate Research Initiative): CC-specific; lab research; multiple partner campuses
• MARC-USTAR (NIH): biomedical research; 2-year program; stipend; at select CCCs
• CSU Summer Undergraduate Research Program (SURP): science and engineering; stipend; varies by campus
• UCLA Transfer Summer Institute: 4-week residential; ALL majors; academic prep + research exposure; transferring.ucla.edu
• UC Berkeley SURF (Summer Undergraduate Research Fellowship): research in any field; competitive; $3,000; apply as prospective transfer
• Amgen Scholars Program: biomedical/biochem research at top universities; paid; amgenscholars.com
• UCSD Research Scholars Program: any STEM or social science; paid; ucsd.edu

═══ HANDSHAKE GUIDANCE ═══
Handshake is used by all 116 California community colleges. Provide specific search tips based on the student's major and college for finding local internships in their region.

───────────────────────────────────────────────────────────────────
Now generate a JSON response. Match programs to THIS STUDENT based on their major, GPA, location, and completed courses. For each match, explain specifically why it fits THEM (not a generic description).

Return ONLY a JSON object with no markdown fences:
{
  "summary": "<2-3 sentence summary of the top opportunities for this specific student based on their profile>",
  "handshakeGuide": "<2-3 sentences with specific Handshake search tips for this student's major, college, and location — include exact search terms to use>",
  "internships": [
    {
      "id": "<unique short slug, e.g. 'doe-cci'>",
      "title": "<official program name>",
      "organization": "<organization name>",
      "type": "<'federal' | 'california_state' | 'research' | 'private' | 'nonprofit'>",
      "category": "<one of: STEM Research | Government & Policy | Healthcare | Business & Finance | Legal & Advocacy | Social Justice | Technology | Environment | Education | Creative & Media>",
      "duration": "<e.g. '10 weeks' or 'Semester-long' or 'Academic year'>",
      "terms": ["<Summer>" | "<Fall>" | "<Spring>" — include all available],
      "stipend": "<e.g. '$600/week' or '$3,000 total' or 'Unpaid (academic credit available)' or 'Paid (GS-4 scale)'>",
      "location": "<e.g. 'Remote' or 'Bay Area, CA' or 'Sacramento, CA' or 'Multiple CA locations' or 'Washington, DC'>",
      "eligibility": ["<requirement 1>", "<requirement 2>"],
      "applicationDeadline": "<e.g. 'February 2025' or 'Rolling' or 'October annually'>",
      "applicationUrl": "<full URL to apply or learn more>",
      "whyMatches": "<2-3 sentences explaining why THIS student is a good fit, citing their major, courses, GPA, or location specifically>",
      "matchScore": <integer 60-99 — only include programs where score >= 60>,
      "citizenshipRequired": <true|false>,
      "handshakeTip": "<optional: if this employer typically posts on Handshake, add a one-sentence search tip>",
      "source": "<where to find this — e.g. 'Apply at energy.gov/cci' or 'Search on Handshake: [search term]' or 'Direct application at URL'>"
    }
  ]
}

Rules:
- Return 12-18 internships, sorted by matchScore descending
- Only include programs genuinely open to current CC students
- For federal programs: include ONLY government-agency or government-research programs, not private sector
- Be realistic about eligibility — if citizenship is required, set citizenshipRequired: true
- All URLs must be real, valid URLs to the actual program page
- whyMatches must reference this student's specific profile details (their major: ${major}, their college: ${college})
- Do not include programs the student clearly doesn't qualify for (e.g., don't recommend NIH biomedical for a business major)`;

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 6000,
        system: SYSTEM_PROMPT + internshipLocaleSuffix,
        messages: [{ role: "user", content: prompt }],
      });
      const text = response.content[0].type === "text" ? response.content[0].text : "";
      const cleaned = text.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();
      const parsed = JSON.parse(cleaned) as InternshipMatchResult;
      if (!Array.isArray(parsed.internships)) throw new Error("Invalid internship result structure");
      return parsed;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < 2) await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
    }
  }
  throw lastError ?? new Error("Failed to generate internship matches");
}

// ─── Entry Feedback ───────────────────────────────────────────────────────────

export interface EntryFeedbackResult {
  aligned: boolean;
  alignmentScore: number;
  currentAdmissionChance: number;
  admissionImpactDelta: number;
  severity: "positive" | "caution" | "concern";
  heading: string;
  feedback: string;
  reconciliationSteps: string[];
  nextAlignedActions: string[];
  guidebookCheck: string;
}

export async function generateEntryFeedback(
  entry: ProgressEntry,
  profile: Record<string, unknown>,
  pathway: Record<string, unknown> | null,
  guidebookMarkdown: string | null,
  recentGpaEntries: ProgressEntry[]
): Promise<EntryFeedbackResult> {
  const college = typeof profile.communityCollege === "string" ? profile.communityCollege : "the student's college";
  const major = typeof profile.intendedMajor === "string" ? profile.intendedMajor : "their major";
  const targetUniversity = pathway ? String(pathway.university ?? "target university") : "no pathway selected";
  const profileGpa = typeof profile.currentGpa === "number" ? profile.currentGpa : null;
  const gpaHistory = recentGpaEntries.map(e => `${e.entryDate ?? "unknown date"}: ${e.numericValue?.toFixed(2) ?? "?"}`).join(", ");

  const prompt = `You are a California community college transfer advisor AI with deep expertise in every aspect of the CCC-to-UC/CSU transfer system. A student just logged a progress update. Analyze it against their guidebook, profile, and the California-specific knowledge base below to give precise, actionable feedback.

Student Profile:
- Community College: ${college}
- Intended Major: ${major}
- Target University: ${targetUniversity}
- Profile GPA: ${profileGpa ?? "not specified"}
- GPA history: ${gpaHistory || "none logged yet"}

New Progress Entry:
- Type: ${entry.entryType}
- Title: ${entry.title}
- Description: ${entry.description ?? "none"}
- Date: ${entry.entryDate ?? "today"}
- Numeric value: ${entry.numericValue != null ? entry.numericValue.toFixed(2) : "N/A"}

Selected Pathway:
${JSON.stringify(pathway ?? {}, null, 2)}

Guidebook Content (use this to check alignment — reference specific sections by name):
${guidebookMarkdown ? guidebookMarkdown.slice(0, 5000) : "No guidebook yet. Base analysis on the pathway and major."}

══════════════════════════════════════════════════════════════
CALIFORNIA-SPECIFIC KNOWLEDGE BASE — apply the relevant section based on entry_type
══════════════════════════════════════════════════════════════

─── CERTIFICATIONS (entry_type: "certification") ───────────────
• Strong Workforce Program: all 116 CCCs offer industry-backed stackable credentials, often free with enrollment. These credentials are tied to CA's high-demand sectors and can be earned alongside a transfer degree.
• By major — recommend or evaluate these specific credentials:
  - Computer Science / IT: CompTIA A+, Network+, Security+; AWS Cloud Practitioner / Solutions Architect; Google Cloud; Salesforce Admin; GitHub Foundations; Microsoft Azure Fundamentals
  - Business / Accounting: QuickBooks ProAdvisor; Salesforce Admin; Google Analytics; CA Real Estate Salesperson License (pre-licensing coursework); CPA exam eligibility tracking (120 units)
  - Health Sciences / Nursing: CNA (Certified Nursing Assistant, state-required), EMT-Basic (CA EMSA), Phlebotomy Technician (CA DHS), Medical Interpreter (CA-approved), BLS/CPR (AHA), HIPAA certification
  - Education: CA Children's Center Permit (Associate Teacher level available with 12 ECE units), CPR/First Aid, Mandated Reporter Training
  - Engineering / Architecture: SOLIDWORKS (CSWA), AutoCAD (Autodesk Certified), OSHA 10/30, FE Exam eligibility (PE pathway)
  - Environmental Science: HAZWOPER (OSHA 40-hour), CA Pesticide Application License, Environmental Compliance Inspection (CWEA)
  - Culinary / Hospitality: ServSafe Food Manager (CA required), TIPS alcohol certification, CA Food Handler Card
  - Criminal Justice: FEMA NIMS certifications, CA POST-approved basic aid training
• If the certification does NOT appear in the guidebook: name the specific certs the guidebook or major recommends instead, and explain why those are better positioned for the target university.
• Some UC/CSU departments grant course credit for industry certifications (e.g., AWS certs at CSU; CISCO Academy at many CCCs).
• Phi Theta Kappa academic honor society recognizes academic excellence — if a student earned a certificate through PTK or an affiliated program, note the Jack Kent Cooke connection.

─── OPPORTUNITIES (entry_type: "opportunity") ─────────────────
• California STEM Pipeline programs (recommend by major):
  - MESA (Mathematics Engineering Science Achievement): state-funded at 120+ CCCs; STEM pipeline to UC/CSU; annual MESA Day competition; strong Transfer Alliance connections; mention if not yet joined
  - NSF REU (Research Experiences for Undergraduates): UC campuses host summer REU sites — apply as a sophomore/junior; comp sci, biology, chemistry, physics especially
  - UCLA Transfer Summer Institute: 4-week residential for CCC students transferring to UCLA in any major
  - UC Berkeley Summer Research Program (SURF): research mentorship for transfer-bound students
  - UCSD Research Scholars Program: strong for STEM and social sciences
  - CSU STEM Student Research Symposium: poster presentation, builds faculty relationships
  - MBRS-RISE / MARC-USTAR: NIH-funded at select CCCs for biomedical research students
• California identity-based programs (strongly recommend if relevant to student background):
  - Puente Project: English composition focus + counseling; primarily serves first-gen Latinx students; UC/CSU readers recognize Puente essays; available at 70+ CCCs
  - UMOJA Community: African American student support; cohort counseling; strong transfer outcomes; available at 50+ CCCs
  - EOPS/CARE: eligibility requires financial need + educational disadvantage; benefits include priority registration, book grants, counseling, emergency funds — must be in this program if eligible
  - Dreamer Resource Centers: AB 540 undocumented students; Dream Act scholarships; campus-specific legal resources
• Transfer-specific programs:
  - Honors Transfer Program: honors-designated courses flag academic readiness for UC; can compensate for lower base GPA; TAP (Transfer Alliance Program) at UCLA/UCI/UCSD/UCSB requires honors completion
  - Transfer Alliance Program (TAP): guaranteed admission to participating UCs for honors students; know campus-specific TAP requirements
  - Transfer Center at their CC: workshops, counselor access, TAG applications — if student hasn't visited, this is priority
• Internships — California-specific:
  - CA Governor's Office Fellow Program (grad-level but note for future)
  - CA Legislative Internship: semester-long paid program in Sacramento
  - Silicon Valley Internship Program (SVIP): Bay Area tech internships for CC students
  - CA Environmental Internship Program: state agency placements
  - JPL (Jet Propulsion Laboratory, Pasadena): community college internships for STEM students
  - Google STEP / Microsoft Explore: explicitly recruit CC transfer students
• If the opportunity is NOT in the guidebook: name the specific programs the guidebook recommends for this student's major and pathway, and explain what they're missing.

─── MILESTONES (entry_type: "milestone") ──────────────────────
• IGETC (Intersegmental General Education Transfer Curriculum):
  - Fully certified IGETC = UC waives all lower-division GE requirements at the university — major benefit
  - Must be certified by the CC Registrar before the transfer date
  - Certification deadline: request in spring semester, before fall transfer
  - STEM exception: UCLA, UC Berkeley, UCSD Engineering/CS/Physical Sciences often prefer major-prep over IGETC — check if their pathway uses IGETC or CSU GE Breadth
  - Partial IGETC: some campuses accept it; others do not — know the target university's policy
  - Area 1B (Critical Thinking) and Area 2 (Math) are most commonly missing — flag if incomplete
• TAG (Transfer Admission Guarantee):
  - Participating UC campuses: Davis, Irvine, Merced, Riverside, Santa Barbara, Santa Cruz (NOT Berkeley or UCLA)
  - GPA minimums: UC Merced 2.4, UC Riverside/Santa Cruz 2.8, UC Davis/Irvine/Santa Barbara 3.2+ (varies by major)
  - Apply in September–October of the CC year before transfer
  - Requires 30 UC-transferable units at time of applying
  - Guarantees admission regardless of applicant pool size
  - Completing TAG = one of the most impactful milestones a student can achieve
• ADT (Associate Degree for Transfer, SB 1440):
  - Guarantees admission to a CSU in a similar major (priority consideration)
  - Requires 60 CSU-transferable units, C or better in major prep, 2.0+ GPA
  - Impacted CSUs still prioritize ADT applicants
  - ADT does NOT guarantee a specific campus — apply broadly
• Application deadlines (flag if milestone relates to timing):
  - UC application: November 1–30 only (no exceptions, no late submissions)
  - CSU application: October 1 – December 15 (some campuses close early when impacted)
  - TAG: September–October prior year
  - Cal Grant FAFSA/Dream Act priority deadline: March 2 each year
• ASSIST.org articulation:
  - All CA CC-to-UC/CSU course equivalencies are published on ASSIST.org
  - If a milestone is completing a specific course, confirm ASSIST shows it as equivalent to the requirement at the target university
  - Flag if the completed course does NOT articulate — student may need to substitute
• Priority Registration: most CCCs grant priority registration after completing 30+ transferable units — huge advantage for securing required courses

─── ACHIEVEMENTS (entry_type: "achievement") ──────────────────
• Phi Theta Kappa (PTK):
  - Top academic honor society for 2-year college students (GPA 3.5+, invited)
  - All-California Academic Team: $1,500 stipend + statewide recognition
  - Jack Kent Cooke Transfer Scholarship ($40,000/yr): PTK membership is a strong signal
  - UC/CSU application honors section: list PTK chapter and year
  - Transfer readers recognize PTK as sustained academic excellence
• Dean's List / President's List:
  - Document in every application's honors/awards section
  - Repeated semesters on Dean's List = strong upward narrative
  - Use in UC PIQ Prompt 5 (leadership/community) or Prompt 4 (creativity/talent)
• Research / Poster Presentations:
  - CSUPERB (CSU Program for Education and Research in Biotechnology) annual symposium — strong for biology/biochemistry/biotech
  - Community College Undergraduate Research Initiative (CCURI)
  - STEM poster presentations documented in applications signal readiness for university research
• Competition wins:
  - MESA Day: state competition win is a major differentiator for STEM transfers
  - Science Olympiad: note division and placement
  - DECA / FBLA (business competitions): recognized by CSU/UC business schools
  - ISGF (International Student Game Festival) for game design students
• Athletic achievements (CCCAA):
  - CA community college athletics (CCCAA) is the largest 2-year athletic association in the US
  - CCCAA All-Conference / All-State = legitimate transfer credential; note in "extracurricular activities"
  - Athletic scholarships at 4-year universities: CC coaches have direct pipelines
• Letters of Recommendation trigger:
  - Significant achievements should prompt the student to request a LoR from the awarding faculty member immediately — faculty letters are most powerful when recent
  - Note if guidebook recommends a minimum number of LoRs for the target major

─── SETBACKS (entry_type: "setback") ──────────────────────────
• GPA — same as GPA_UPDATE if the setback is grade-related:
  - Academic Renewal Petition: exclude up to 24 units of D/F from GPA with documented circumstances
  - CA Ed Code 55042 Grade Repeat: retake course, new grade replaces old in CCC GPA calculation (not UC GPA)
  - UC GPA recalculation: UC calculates its own GPA (grades 10-11-12 + CC) — some D/F courses excluded if retaken
  - Upward trend: a 2.7→3.5 trajectory is often more compelling to UC readers than a flat 3.2
• W (Withdrawal) grades:
  - UC policy: 2 W's acceptable; 3+ W's require explanation (use PIQ prompt 8 — additional information)
  - Late Withdrawal Petition: available at most CCCs for documented extenuating circumstances (medical, job loss, family emergency)
  - EW (Excused Withdrawal): COVID-era policy still available at some CCCs; removes W from transcript and doesn't impact GPA
  - W does NOT affect GPA calculation, but affects unit completion rate (pace)
• Academic Probation:
  - SSSP (Student Success and Support Program): mandatory counseling, create a student education plan
  - PACE (Probation Academic Challenge Exit): structured 1-semester intensive at many CCCs
  - Academic Dismissal Appeal: if dismissed, appeal with documented circumstances + plan of action
  - Most CCCs: one semester probation before dismissal — immediate intervention required
• Dropped required prerequisite:
  - Check ASSIST.org for alternate equivalent courses
  - UC Scout (online CA-accredited courses) and California Virtual Campus: fill prerequisite gaps online
  - Summer session at any CCC: fastest way to clear a missed prerequisite
  - Some UCs allow "in progress" prerequisites at time of application if completed by June
• Missing a milestone (timeline setback):
  - Spring admission: UC Berkeley, UCLA, UCSD, UCSB, UCD all accept spring transfer applicants
  - CSU spring admission: broadly available at most campuses
  - An extra semester can be used strategically: complete TAG, improve GPA, add research or internship

─── GPA UPDATE (entry_type: "gpa_update") ──────────────────────
• Compare the logged GPA against the target university's stated minimum for this major (check pathway report)
• If below minimum: Academic Renewal Petition, Ed Code 55042 repeat policy, upward trend narrative
• If meeting minimum: validate and flag which TAG campus GPA tiers this qualifies for
• If above 3.5: flag PTK eligibility (if not yet member), TAG qualification, honors program eligibility
• Trend analysis: is this GPA going up, down, or stable compared to previous GPA entries?
• STEM majors: UC Berkeley EECS and UCLA CS effective GPA minimums are 3.7+; flag if gap exists and suggest alternate pathways (UCSD, UCD, UCSB CS programs often more accessible)

─── NOTE (entry_type: "note") ────────────────────────────────
• Identify any action items embedded in the note (e.g., "met with counselor" → flag any follow-up items)
• If the note mentions a concern, classify it and apply the relevant section above
• Validate or redirect based on what the guidebook says about this topic

══════════════════════════════════════════════════════════════
OUTPUT FORMAT — return ONLY a JSON object, no markdown fences:
══════════════════════════════════════════════════════════════
{
  "aligned": <boolean — does this entry align with the guidebook's specific recommendations?>,
  "alignmentScore": <integer 0-100 — how well this entry fits the guidebook plan for this student>,
  "currentAdmissionChance": <integer 0-100 — estimated % admission chance to target university considering everything known>,
  "admissionImpactDelta": <integer -15 to +15 — how much this single entry shifts the estimated chance>,
  "severity": <"positive" | "caution" | "concern">,
  "heading": <string — 6-10 word headline that is specific to THIS entry, not generic>,
  "feedback": <string — 2-4 sentences: reference the guidebook by name, cite the specific CA program or policy that applies, be honest and precise>,
  "reconciliationSteps": <array of 2-5 strings — for concern/caution entries: specific actionable steps drawn from the CA knowledge base above. For positive aligned entries: 1-2 "ways to maximize this" steps. Never leave empty — always give concrete CA-specific next actions relevant to the entry type.>,
  "nextAlignedActions": <array of 2-4 strings — next steps explicitly from the guidebook that keep the student on track>,
  "guidebookCheck": <string — one sentence citing a specific guidebook section or recommendation and whether this entry matches or diverges from it>
}`;

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: prompt }],
      });
      const text = response.content[0].type === "text" ? response.content[0].text : "";
      const cleaned = text.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();
      const parsed = JSON.parse(cleaned) as EntryFeedbackResult;
      return {
        aligned: Boolean(parsed.aligned),
        alignmentScore: Math.max(0, Math.min(100, Math.round(parsed.alignmentScore ?? 50))),
        currentAdmissionChance: Math.max(0, Math.min(100, Math.round(parsed.currentAdmissionChance ?? 50))),
        admissionImpactDelta: Math.max(-15, Math.min(15, Math.round(parsed.admissionImpactDelta ?? 0))),
        severity: parsed.severity ?? "caution",
        heading: parsed.heading ?? "Entry analyzed",
        feedback: parsed.feedback ?? "",
        reconciliationSteps: Array.isArray(parsed.reconciliationSteps) ? parsed.reconciliationSteps : [],
        nextAlignedActions: Array.isArray(parsed.nextAlignedActions) ? parsed.nextAlignedActions : [],
        guidebookCheck: parsed.guidebookCheck ?? "",
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < 2) await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
  throw lastError ?? new Error("Failed to generate entry feedback");
}

// ─── Course Catalog ───────────────────────────────────────────────────────────

export interface CatalogCourse {
  courseCode: string;
  courseName: string;
  units: number;
  description: string;
  category: string;
  igetcArea?: string;
  csuGEArea?: string;
  transferable: boolean;
}

export interface CourseCatalog {
  college: string;
  major: string;
  categories: string[];
  courses: CatalogCourse[];
}

export async function generateCourseCatalog(
  college: string,
  major: string
): Promise<CourseCatalog> {
  const prompt = `You are an expert on California community college course catalogs. Generate an accurate, comprehensive list of courses offered at ${college} that are relevant to a student pursuing ${major}.

Include:
1. All core major/program courses for ${major} at ${college}
2. All IGETC-applicable GE courses offered at ${college} (English composition, critical thinking, math, arts/humanities, social sciences, natural sciences, language)
3. Common electives and prerequisite courses related to ${major}

Use the ACTUAL course codes and unit counts from ${college}'s current catalog. If you are uncertain about a specific course code at this college, use the standard California CCC numbering convention for that subject.

Return ONLY a JSON object with this exact structure (no markdown, no preamble):
{
  "college": "${college}",
  "major": "${major}",
  "categories": ["Major Requirements", "IGETC / GE Requirements", "Electives & Prerequisites"],
  "courses": [
    {
      "courseCode": "PSYCH 1",
      "courseName": "Introduction to Psychology",
      "units": 3,
      "description": "Brief one-sentence description from catalog.",
      "category": "Major Requirements",
      "igetcArea": "Area 4",
      "csuGEArea": "D9",
      "transferable": true
    }
  ]
}

Rules:
- "category" must be one of: "Major Requirements", "IGETC / GE Requirements", "Electives & Prerequisites"
- Include 40-80 courses total to give the student comprehensive coverage
- "units" must be a number (e.g. 3, 4, 5) matching the actual catalog unit count
- "transferable" is true if the course transfers to UC/CSU systems
- "igetcArea" and "csuGEArea" should only be set when the course genuinely satisfies that requirement
- For GE courses, accurately tag IGETC areas: Area 1A (English Comp), Area 1B (Critical Thinking), Area 2 (Math), Area 3A/3B (Arts/Humanities), Area 4 (Social Sciences), Area 5A/5B (Science), Area 6 (Language)
- Use the college's actual department prefixes (e.g. PSYCH, ENGL, MATH, BIO, HIST, ART, etc.)

Respond with only the JSON object.`;

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
      const parsed = JSON.parse(cleaned) as CourseCatalog;

      if (!parsed.courses || !Array.isArray(parsed.courses)) {
        throw new Error("Invalid course catalog structure");
      }
      return parsed;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < 2) await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw lastError ?? new Error("Failed to generate course catalog");
}

// ─── Transferability Analysis ────────────────────────────────────────────────

export interface CourseTransferResult {
  courseCode?: string;
  courseName: string;
  units: number;
  status: "transferable" | "likely" | "uncertain" | "unlikely";
  igetcArea?: string;
  csuGEArea?: string;
  assistNote: string;
}

export interface UniversityMatch {
  university: string;
  system: string;
  matchScore: number;
  matchReason: string;
  transferableCount: number;
  totalCourses: number;
}

export interface IgetcSummary {
  area1AEnglish: boolean;
  area1BCriticalThinking: boolean;
  area2Math: boolean;
  area3Arts: boolean;
  area4Social: boolean;
  area5Science: boolean;
  area6Language: boolean;
  completedAreas: string[];
  missingAreas: string[];
}

export interface TransferabilityAnalysisResult {
  communityCollege: string;
  summary: string;
  bestMatches: UniversityMatch[];
  courseAnalysis: CourseTransferResult[];
  igetcSummary: IgetcSummary;
  totalTransferableUnits: number;
  recommendations: string[];
}

export async function generateTransferabilityAnalysis(
  courses: Record<string, unknown>[],
  communityCollege: string
): Promise<TransferabilityAnalysisResult> {
  const courseList = courses.map(c =>
    `- ${c.courseCode ? c.courseCode + " " : ""}${c.courseName} (${c.units ?? 3} units, ${c.status ?? "completed"}${c.grade ? ", grade " + c.grade : ""})`
  ).join("\n");

  const prompt = `You are an expert California community college articulation advisor with deep knowledge of ASSIST.org articulation agreements, IGETC (Intersegmental General Education Transfer Curriculum), and CSU GE-Breadth requirements.

A student from ${communityCollege} has submitted the following courses:

${courseList}

Analyze each course's transferability to California 4-year universities (UC and CSU systems, plus major California privates) using your knowledge of ASSIST.org articulation agreements and California transfer requirements.

Return ONLY a JSON object with this exact structure (no markdown, no preamble):
{
  "communityCollege": "${communityCollege}",
  "summary": "2-3 sentence overall assessment of this student's course list for California transfer purposes",
  "bestMatches": [
    {
      "university": "Full university name",
      "system": "UC | CSU | Private",
      "matchScore": 85,
      "matchReason": "Specific reason why this university's articulation agreements best match these courses",
      "transferableCount": 8,
      "totalCourses": 10
    }
  ],
  "courseAnalysis": [
    {
      "courseCode": "ENGL 101",
      "courseName": "English Composition",
      "units": 3,
      "status": "transferable",
      "igetcArea": "Area 1A",
      "csuGEArea": "A2",
      "assistNote": "Accepted at all UC and CSU campuses as an English Composition equivalent. Satisfies IGETC Area 1A."
    }
  ],
  "igetcSummary": {
    "area1AEnglish": true,
    "area1BCriticalThinking": false,
    "area2Math": false,
    "area3Arts": false,
    "area4Social": true,
    "area5Science": false,
    "area6Language": false,
    "completedAreas": ["Area 1A - English Communication (English Composition)"],
    "missingAreas": ["Area 1B - Critical Thinking", "Area 2 - Mathematical Concepts and Quantitative Reasoning", "Area 3 - Arts and Humanities", "Area 5 - Physical and Biological Sciences", "Area 6 - Languages Other Than English"]
  },
  "totalTransferableUnits": 18,
  "recommendations": [
    "Specific actionable recommendation 1",
    "Specific actionable recommendation 2"
  ]
}

Rules:
- "status" must be exactly one of: "transferable" (confirmed ASSIST equivalent), "likely" (strong match, verify on assist.org), "uncertain" (may transfer but course title is ambiguous), "unlikely" (vocational/remedial courses that typically don't transfer)
- "igetcArea" and "csuGEArea" should only be set if you are confident the course satisfies that requirement
- List 3-5 best university matches, ordered by matchScore descending
- "totalTransferableUnits" should count only courses with status "transferable" or "likely"
- Give 3-5 specific, actionable recommendations focused on completing IGETC and strengthening the transfer application
- assistNote should reference ASSIST.org patterns and explain WHY the course does or doesn't transfer

Respond with only the JSON object.`;

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
      const parsed = JSON.parse(cleaned) as TransferabilityAnalysisResult;

      if (!parsed.courseAnalysis || !Array.isArray(parsed.courseAnalysis)) {
        throw new Error("Invalid transferability analysis structure");
      }
      return parsed;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < 2) await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw lastError ?? new Error("Failed to generate transferability analysis");
}

// ─── Deep Dive Synthesis ──────────────────────────────────────────────────────

export interface DeepDiveSectionInput {
  key: "admissions" | "cost" | "outcomes" | "campus_life" | "news";
  title: string;
  rawAnswer: string;
  citations: { title?: string; url: string; snippet?: string }[];
}

export interface DeepDiveSynthSection {
  key: "admissions" | "cost" | "outcomes" | "campus_life" | "news";
  title: string;
  body: string;
  citations: { title?: string; url: string; snippet?: string }[];
}

export async function synthesizeDeepDive(
  universityName: string,
  major: string,
  inputs: DeepDiveSectionInput[],
  locale: string = "en",
): Promise<DeepDiveSynthSection[]> {
  const { localeJsonPromptSuffix } = await import("../lib/locale.js");
  const deepDiveLocaleSuffix = localeJsonPromptSuffix(locale);
  const evidence = inputs.map((s) => {
    const cites = s.citations.map((c, i) => `[${i + 1}] ${c.title ?? c.url}: ${c.snippet ?? ""}`).join("\n");
    return `### ${s.title} (key: ${s.key})\nTavily summary:\n${s.rawAnswer}\n\nSources:\n${cites}`;
  }).join("\n\n");

  const prompt = `You are an objective research analyst writing a "Deep Dive" report for a California community college transfer student about ${universityName} with intended major: ${major}.

You are given Tavily web research evidence broken into 5 sections. For EACH section, write a tight 120-200 word factual analysis grounded in the evidence below. Use inline citation markers like [1], [2] that reference the source numbers from that section's source list. Do not invent statistics. If a fact is not in the evidence, say "not available in current sources."

For "outcomes", focus specifically on the ${major} program: admit rates by major, transfer GPA medians, and post-grad outcomes when available.
For "news", summarize 2-4 recent campus developments from the last 12 months only.

Evidence:
${evidence}

Return ONLY valid JSON (no fences, no preamble) with this exact shape:
{
  "sections": [
    { "key": "admissions", "title": "Admissions", "body": "..." },
    { "key": "cost", "title": "Cost of Attendance", "body": "..." },
    { "key": "outcomes", "title": "Major Outcomes", "body": "..." },
    { "key": "campus_life", "title": "Campus Life", "body": "..." },
    { "key": "news", "title": "Recent News", "body": "..." }
  ]
}`;

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 3000,
        system: SYSTEM_PROMPT + deepDiveLocaleSuffix,
        messages: [{ role: "user", content: prompt }],
      });

      const text = response.content[0].type === "text" ? response.content[0].text : "";
      const cleaned = text.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();
      const parsed = JSON.parse(cleaned) as { sections: { key: DeepDiveSynthSection["key"]; title: string; body: string }[] };
      if (!Array.isArray(parsed.sections) || parsed.sections.length === 0) {
        throw new Error("Invalid deep dive structure");
      }
      const byKey = new Map(inputs.map((i) => [i.key, i.citations]));
      return parsed.sections.map((s) => ({
        key: s.key,
        title: s.title,
        body: s.body,
        citations: byKey.get(s.key) ?? [],
      }));
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < 2) await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
  throw lastError ?? new Error("Failed to synthesize deep dive");
}
