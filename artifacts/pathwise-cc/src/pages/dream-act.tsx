import Nav from "@/components/nav";
import { ExternalLink, Heart, BookOpen, DollarSign, Shield, CheckCircle2, AlertCircle, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Resource { label: string; url: string; desc: string; }

const SECTIONS = [
  {
    id: "ab540",
    icon: Shield,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    border: "border-indigo-200",
    title: "AB 540 — California Non-Resident Tuition Exemption",
    content: `AB 540 (Assembly Bill 540) allows certain students — regardless of immigration status — to pay in-state tuition rates at California public colleges and universities. This is NOT the same as being a resident; it is an exemption from non-resident tuition surcharges.`,
    eligibility: [
      "Attended a California high school for 3+ years (or attained credits equivalent to 3 years)",
      "Graduated from a California high school, received a GED, or passed the California High School Proficiency Exam",
      "Enrolled or will enroll in a California public college or university",
      "If you have a visa that allows you to establish California domicile, you must meet residency requirements instead",
    ],
    note: "AB 540 does NOT grant immigration status. It only affects tuition rates at California public colleges.",
    resources: [
      { label: "AB 540 — California Student Aid Commission", url: "https://www.csac.ca.gov/ab540", desc: "Official CSAC overview" },
      { label: "Undocumented Student Resources — UC", url: "https://undoc.universityofcalifornia.edu", desc: "UC-wide undocumented student support" },
    ],
  },
  {
    id: "dream-act",
    icon: DollarSign,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    title: "California Dream Act — State Financial Aid",
    content: `The California Dream Act (AB 130 and AB 131) allows AB 540-eligible students to apply for and receive California state financial aid, including Cal Grants, institutional grants, community college fee waivers (BOGFW), and CSU and UC grants.`,
    eligibility: [
      "Meet AB 540 requirements (see above)",
      "Submit the California Dream Act Application (CADAA) — not FAFSA",
      "Demonstrate financial need",
      "Be enrolled at a California public college or university",
      "Maintain satisfactory academic progress",
    ],
    note: "Apply at dream.csac.ca.gov by the Cal Grant deadline (March 2 each year). Early filing maximizes aid.",
    resources: [
      { label: "California Dream Act Application (CADAA)", url: "https://dream.csac.ca.gov", desc: "Apply for state financial aid" },
      { label: "Cal Grant Program", url: "https://www.csac.ca.gov/cal-grants", desc: "Up to $9,700/year for UC; $5,742 for CSU" },
      { label: "Community College Fee Waiver (BOGFW)", url: "https://www.cccco.edu/Students/Pay-for-College/Fee-Waivers", desc: "Free CC enrollment for eligible students" },
    ],
  },
  {
    id: "dreamers",
    icon: Heart,
    color: "text-rose-600",
    bg: "bg-rose-50",
    border: "border-rose-200",
    title: "DACA & Undocumented Student Resources",
    content: `Students with DACA (Deferred Action for Childhood Arrivals) status are eligible for AB 540 and the California Dream Act. DACA students can also work legally and obtain a Social Security number and driver's license in California.`,
    eligibility: [
      "DACA recipients: eligible for AB 540, CA Dream Act, and California in-state tuition",
      "Non-DACA undocumented students: eligible for AB 540 and CA Dream Act if meeting those requirements",
      "Mixed-status families: family income counted for financial aid regardless of family members' status",
    ],
    note: "DACA status does NOT make you eligible for federal financial aid (FAFSA). Use the California Dream Act Application (CADAA) instead.",
    resources: [
      { label: "Undocumented Student Action Network", url: "https://undocumentedstudents.org", desc: "CA-specific resources" },
      { label: "MyPath — Immigrant Student Portal", url: "https://www.mypath.org", desc: "Financial aid navigation for undocumented students" },
      { label: "Immigrants Rising", url: "https://immigrantsrising.org", desc: "Entrepreneurship and education for undocumented youth" },
    ],
  },
  {
    id: "scholarships",
    icon: BookOpen,
    color: "text-slate-900",
    bg: "bg-violet-50",
    border: "border-violet-200",
    title: "Scholarships Available to Undocumented / AB 540 Students",
    content: `Many private scholarships are open to undocumented students regardless of DACA or immigration status. Federal aid (Pell Grant, federal loans) requires FAFSA eligibility, but California-specific and private scholarships have no such requirement.`,
    eligibility: [
      "Dream.US National Scholarship — up to $10,000/year for DACA and TPS recipients transferring to a partner university",
      "California Community Foundation Scholarships — multiple awards for undocumented LA-area students",
      "Mexican American Legal Defense (MALDEF) scholarships",
      "Golden Door Scholars — for undocumented students at select universities",
      "TheDream.US Opportunity Scholarship — for students in states without in-state tuition",
      "Point Foundation — for LGBTQ+ students including undocumented",
      "Many campuses have dedicated emergency funds and scholarships for AB 540 students",
    ],
    note: "Always verify scholarship eligibility requirements. Do not disclose immigration status unless explicitly required — most private scholarships do not ask.",
    resources: [
      { label: "Dream.US National Scholarship", url: "https://www.thedream.us", desc: "Up to $10,000/year for DACA recipients" },
      { label: "Golden Door Scholars", url: "https://goldendoorscholars.org", desc: "For undocumented students" },
      { label: "ThinkImpact — Undocumented Student Scholarships", url: "https://www.thinkimpact.com/undocumented-student-scholarships", desc: "Curated scholarship list" },
    ],
  },
];

function ResourceLink({ r }: { r: Resource }) {
  return (
    <a href={r.url} target="_blank" rel="noopener noreferrer"
      className="flex items-center justify-between gap-2 px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-medium hover:border-indigo-300 hover:bg-indigo-50 transition group">
      <div>
        <div className="font-semibold text-slate-800">{r.label}</div>
        <div className="text-slate-400 mt-0.5">{r.desc}</div>
      </div>
      <ExternalLink className="h-3.5 w-3.5 text-slate-300 group-hover:text-indigo-500 flex-shrink-0" />
    </a>
  );
}

export default function DreamAct() {
  return (
    <div className="min-h-screen bg-[#f4f4f5] text-slate-900" style={{ fontFamily: "Inter, sans-serif" }}>
      <style dangerouslySetInnerHTML={{ __html: ".pwc-font-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; }" }} />
      <Nav />
      <main className="pt-14 pb-20 md:pb-8 px-4 md:px-8 max-w-3xl mx-auto">
        <div className="py-7">
          <div className="flex items-center gap-2 mb-1">
            <Heart className="h-5 w-5 text-rose-500" />
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 uppercase tracking-tight">AB 540 & Dream Act Guide</h1>
          </div>
          <p className="text-slate-500 text-sm max-w-xl">
            California's community college system is one of the most accessible in the country for undocumented and mixed-status students. Here's what you need to know.
          </p>
        </div>

        {/* Important note */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3 mb-6">
          <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-800">This guide is for informational purposes only</p>
            <p className="text-xs text-amber-700 mt-1">Immigration law changes frequently. Always consult with an immigration attorney or your college's undocumented student resource center before making decisions based on this information.</p>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-6">
          {SECTIONS.map(section => {
            const Icon = section.icon;
            return (
              <div key={section.id} className={cn("bg-white border rounded-2xl overflow-hidden", section.border)}>
                {/* Header */}
                <div className={cn("px-5 py-4 flex items-center gap-3", section.bg)}>
                  <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", section.bg)}>
                    <Icon className={cn("h-5 w-5", section.color)} />
                  </div>
                  <h2 className="font-bold text-slate-900 text-base leading-snug">{section.title}</h2>
                </div>

                {/* Body */}
                <div className="px-5 py-4 space-y-4">
                  <p className="text-sm text-slate-700 leading-relaxed">{section.content}</p>

                  {/* Eligibility / Key points */}
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                      {section.id === "scholarships" ? "Key Scholarships" : "Eligibility Requirements"}
                    </p>
                    <ul className="space-y-1.5">
                      {section.eligibility.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                          <CheckCircle2 className={cn("h-4 w-4 flex-shrink-0 mt-0.5", section.color)} />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Note */}
                  <div className={cn("rounded-xl px-3 py-2.5 border flex items-start gap-2", section.bg, section.border)}>
                    <ChevronRight className={cn("h-4 w-4 flex-shrink-0 mt-0.5", section.color)} />
                    <p className="text-xs font-medium text-slate-700">{section.note}</p>
                  </div>

                  {/* Resources */}
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Resources</p>
                    <div className="space-y-2">
                      {section.resources.map(r => <ResourceLink key={r.url} r={r} />)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Support */}
        <div className="mt-8 bg-indigo-50 border border-indigo-200 rounded-2xl p-5">
          <p className="text-sm font-bold text-indigo-900 mb-1">Need help at your campus?</p>
          <p className="text-xs text-indigo-700 mb-3">Most California community colleges have dedicated resources for undocumented students. Ask for the:</p>
          <ul className="space-y-1.5">
            {["Undocumented Student Resource Center (or coordinator)", "EOPS/CARE office — often supports undocumented students", "Financial Aid office — for Dream Act application help", "Transfer Center — for college application guidance"].map(r => (
              <li key={r} className="flex items-center gap-2 text-xs text-indigo-700">
                <CheckCircle2 className="h-3.5 w-3.5 text-indigo-400 flex-shrink-0" />{r}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-slate-400 text-center mt-6 pb-4">
          DYP · AB 540 & Dream Act Guide · Information current as of early 2025 · Always verify with official sources
        </p>
      </main>
    </div>
  );
}
