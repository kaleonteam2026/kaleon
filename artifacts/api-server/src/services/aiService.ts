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
