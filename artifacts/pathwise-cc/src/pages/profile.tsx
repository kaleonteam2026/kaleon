import { useEffect, useState, useRef, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import Nav from "@/components/nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Save, ArrowRight, Loader2, Search, ChevronDown, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

// All 116 California Community Colleges
const COLLEGES = [
  // Los Angeles Region
  "Los Angeles City College", "East Los Angeles College", "Los Angeles Harbor College",
  "Los Angeles Mission College", "Los Angeles Pierce College", "Los Angeles Southwest College",
  "Los Angeles Trade-Technical College", "Los Angeles Valley College", "West Los Angeles College",
  "Santa Monica College", "El Camino College", "Compton College",
  "Long Beach City College", "Cerritos College", "Citrus College",
  "Mt. San Antonio College", "Pasadena City College", "Glendale Community College",
  "Rio Hondo College", "East Los Angeles College", "Antelope Valley College",
  "College of the Canyons", "Moorpark College", "Oxnard College",
  "Ventura College",
  // Orange County
  "Cypress College", "Fullerton College", "Golden West College",
  "Irvine Valley College", "Orange Coast College", "Saddleback College",
  "Santiago Canyon College",
  // San Diego Region
  "Grossmont College", "Cuyamaca College", "MiraCosta College",
  "Palomar College", "San Diego City College", "San Diego Mesa College",
  "San Diego Miramar College", "Southwestern College",
  // Inland Empire
  "Chaffey College", "Crafton Hills College", "San Bernardino Valley College",
  "Riverside City College", "Moreno Valley College", "Norco College",
  "Victor Valley College", "Mt. San Jacinto College",
  // San Francisco Bay Area
  "City College of San Francisco", "College of Marin", "College of San Mateo",
  "Cañada College", "Skyline College", "Chabot College",
  "Las Positas College", "Ohlone College", "Foothill College",
  "De Anza College", "Mission College", "West Valley College",
  "Evergreen Valley College", "San Jose City College",
  // East Bay
  "Laney College", "Merritt College", "Berkeley City College",
  "College of Alameda", "Diablo Valley College", "Los Medanos College",
  "Contra Costa College",
  // Central Valley & Central Coast
  "Fresno City College", "Reedley College", "Clovis Community College",
  "Madera Community College", "Bakersfield College", "Porterville College",
  "Taft College", "Cerro Coso Community College",
  "Allan Hancock College", "Cuesta College", "Lompoc Valley Community College",
  "Ventura County Community College District", "Cabrillo College",
  "Hartnell College", "Gavilan College", "Monterey Peninsula College",
  // Sacramento Region
  "Sacramento City College", "American River College",
  "Cosumnes River College", "Folsom Lake College",
  "Sierra College", "Los Rios Community College District",
  // Northern California
  "Butte College", "Shasta College", "Redwoods College",
  "Mendocino College", "Lake Tahoe Community College", "Lassen Community College",
  "Modesto Junior College", "Columbia College", "Merced College",
  "Yosemite Community College", "Stanislaus Community College",
  "San Joaquin Delta College", "Humphreys University",
  // Bay Area / Peninsula
  "San Francisco State — Not a CCC", // placeholder guard
  // Misc / Other Districts
  "Barstow Community College", "Copper Mountain College",
  "Palo Verde College", "Imperial Valley College",
  "San Diego Continuing Education",
  "Other (not listed)",
].filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => {
  if (a === "Other (not listed)") return 1;
  if (b === "Other (not listed)") return -1;
  return a.localeCompare(b);
}).filter(c => c !== "San Francisco State — Not a CCC");

// ─── Searchable college picker ─────────────────────────────────────────────────
function CollegePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return q ? COLLEGES.filter(c => c.toLowerCase().includes(q)) : COLLEGES;
  }, [search]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const pick = (college: string) => {
    onChange(college);
    setOpen(false);
    setSearch("");
  };

  return (
    <div ref={containerRef} className="relative">
      <div
        className={cn(
          "w-full flex items-stretch rounded-md border bg-white shadow-sm transition",
          open ? "border-indigo-500 ring-1 ring-indigo-400" : "border-slate-300 hover:border-slate-400"
        )}
      >
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="flex-1 flex items-center justify-between gap-2 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-md"
        >
          <span className={value ? "text-slate-900 font-medium truncate" : "text-slate-600"}>
            {value || "Select your college"}
          </span>
          <ChevronDown className={cn("h-4 w-4 text-slate-600 transition-transform flex-shrink-0", open && "rotate-180")} aria-hidden="true" />
        </button>
        {value && (
          <button
            type="button"
            aria-label="Clear college selection"
            onClick={() => pick("")}
            className="px-2 text-slate-500 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-md border-l border-slate-200"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search colleges…"
                className="w-full pl-8 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:bg-white"
              />
            </div>
          </div>

          <div className="overflow-y-auto max-h-60 py-1">
            {filtered.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-6">No colleges match.</p>
            ) : (
              filtered.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => pick(c)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-indigo-50 transition",
                    c === value && "bg-indigo-50"
                  )}
                >
                  <span className="flex-1 truncate text-slate-800">{c}</span>
                  {c === value && <Check className="h-3.5 w-3.5 text-indigo-500 flex-shrink-0" />}
                </button>
              ))
            )}
          </div>

          <div className="px-3 py-1.5 border-t border-slate-100 text-xs text-slate-400 text-center">
            {filtered.length} of {COLLEGES.length} colleges
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface ProfileData {
  id?: number;
  fullName: string;
  communityCollege: string;
  currentGpa: string;
  intendedMajor: string;
  careerGoal: string;
  financialSituation: string;
  transferTimeline: string;
  geographicPreference: string;
  longTermAspirations: string;
  isFirstGen: string;
  interests: string;
}

const EMPTY: ProfileData = {
  fullName: "", communityCollege: "", currentGpa: "", intendedMajor: "",
  careerGoal: "", financialSituation: "", transferTimeline: "",
  geographicPreference: "", longTermAspirations: "", isFirstGen: "", interests: "",
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Profile() {
  const { profileId } = useParams<{ profileId?: string }>();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [form, setForm] = useState<ProfileData>(EMPTY);
  const [loading, setLoading] = useState(!!profileId);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profileId) {
      fetch(`/api/profiles/${profileId}`, { credentials: "include" })
        .then(r => r.json())
        .then((p: Record<string, unknown>) => {
          setForm({
            id: p.id as number,
            fullName: (p.fullName as string) ?? "",
            communityCollege: (p.communityCollege as string) ?? "",
            currentGpa: p.currentGpa ? String(p.currentGpa) : "",
            intendedMajor: (p.intendedMajor as string) ?? "",
            careerGoal: (p.careerGoal as string) ?? "",
            financialSituation: (p.financialSituation as string) ?? "",
            transferTimeline: (p.transferTimeline as string) ?? "",
            geographicPreference: (p.geographicPreference as string) ?? "",
            longTermAspirations: (p.longTermAspirations as string) ?? "",
            isFirstGen: (p.isFirstGen as string) ?? "",
            interests: Array.isArray(p.interests) ? (p.interests as string[]).join(", ") : "",
          });
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else if (user?.id) {
      fetch(`/api/profiles/user/${user.id}`, { credentials: "include" })
        .then(r => r.json())
        .then((profiles: Record<string, unknown>[]) => {
          if (profiles.length > 0) {
            const p = profiles[0];
            setForm({
              id: p.id as number,
              fullName: (p.fullName as string) ?? "",
              communityCollege: (p.communityCollege as string) ?? "",
              currentGpa: p.currentGpa ? String(p.currentGpa) : "",
              intendedMajor: (p.intendedMajor as string) ?? "",
              careerGoal: (p.careerGoal as string) ?? "",
              financialSituation: (p.financialSituation as string) ?? "",
              transferTimeline: (p.transferTimeline as string) ?? "",
              geographicPreference: (p.geographicPreference as string) ?? "",
              longTermAspirations: (p.longTermAspirations as string) ?? "",
              isFirstGen: (p.isFirstGen as string) ?? "",
              interests: Array.isArray(p.interests) ? (p.interests as string[]).join(", ") : "",
            });
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [profileId, user?.id]);

  const set = (field: keyof ProfileData, value: string) => {
    setForm(f => ({ ...f, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        currentGpa: form.currentGpa ? parseFloat(form.currentGpa) : undefined,
        interests: form.interests ? form.interests.split(",").map(s => s.trim()).filter(Boolean) : [],
      };

      let saved: Record<string, unknown>;
      if (form.id) {
        const r = await fetch(`/api/profiles/${form.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          credentials: "include",
        });
        saved = await r.json() as Record<string, unknown>;
      } else {
        const r = await fetch("/api/profiles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          credentials: "include",
        });
        saved = await r.json() as Record<string, unknown>;
        setForm(f => ({ ...f, id: saved.id as number }));
      }

      toast({ title: "Profile saved!", description: "Your profile has been updated." });
      navigate(`/courses/${saved.id}`);
    } catch {
      toast({ title: "Error saving profile", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f4f5] flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-900 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f4f5] text-slate-900" style={{ fontFamily: "Inter, sans-serif" }}>
      <style dangerouslySetInnerHTML={{ __html: ".pwc-font-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; }" }} />
      <Nav profileId={form.id} />
      <main id="main-content" tabIndex={-1} className="pt-14 pb-20 md:pb-8 px-4 md:px-8 max-w-3xl mx-auto focus:outline-none">
        <div className="py-6 border-b-2 border-slate-900 mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 uppercase tracking-tight">Student Profile</h1>
          <p className="text-slate-600 text-sm mt-1">Complete your profile to get personalized transfer pathway recommendations.</p>
        </div>

        <div className="space-y-6 pb-12">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input id="fullName" value={form.fullName} onChange={e => set("fullName", e.target.value)} placeholder="Your full name" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="currentGpa">Current GPA</Label>
                  <Input id="currentGpa" type="number" min="0" max="4" step="0.01" value={form.currentGpa} onChange={e => set("currentGpa", e.target.value)} placeholder="e.g. 3.5" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Community College</Label>
                <CollegePicker value={form.communityCollege} onChange={v => set("communityCollege", v)} />
                <p className="text-xs text-slate-400">Can't find your college? Choose "Other (not listed)" and type it in below.</p>
              </div>

              {form.communityCollege === "Other (not listed)" && (
                <div className="space-y-1.5">
                  <Label htmlFor="collegeOther">College Name</Label>
                  <Input
                    id="collegeOther"
                    placeholder="Type your California community college name"
                    onChange={e => set("communityCollege", e.target.value || "Other (not listed)")}
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="isFirstGen">Are you a first-generation college student?</Label>
                <Select value={form.isFirstGen} onValueChange={v => set("isFirstGen", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes — neither parent completed a 4-year degree</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                    <SelectItem value="unsure">Not sure</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Academic & Career Goals */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Academic & Career Goals</CardTitle>
              <CardDescription>Be as specific as possible — this drives your AI pathway recommendations.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="intendedMajor">Intended Major</Label>
                <Input id="intendedMajor" value={form.intendedMajor} onChange={e => set("intendedMajor", e.target.value)} placeholder="e.g. Psychology, Computer Science, Business Administration" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="careerGoal">Career Goal</Label>
                <Input id="careerGoal" value={form.careerGoal} onChange={e => set("careerGoal", e.target.value)} placeholder="e.g. Software engineer at a tech company, Clinical psychologist, Lawyer" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="longTermAspirations">Long-Term Aspirations</Label>
                <Textarea id="longTermAspirations" value={form.longTermAspirations} onChange={e => set("longTermAspirations", e.target.value)} placeholder="Describe your 5–10 year vision. Graduate school? Starting a business? Working in a specific community?" rows={3} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="interests">Interests & Hobbies (comma-separated)</Label>
                <Input id="interests" value={form.interests} onChange={e => set("interests", e.target.value)} placeholder="e.g. coding, community service, creative writing, social justice" />
              </div>
            </CardContent>
          </Card>

          {/* Transfer Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Transfer Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Transfer Timeline</Label>
                <Select value={form.transferTimeline} onValueChange={v => set("transferTimeline", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="When do you plan to transfer?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fall 2025">Fall 2025</SelectItem>
                    <SelectItem value="spring 2026">Spring 2026</SelectItem>
                    <SelectItem value="fall 2026">Fall 2026</SelectItem>
                    <SelectItem value="fall 2027">Fall 2027</SelectItem>
                    <SelectItem value="fall 2028 or later">Fall 2028 or later</SelectItem>
                    <SelectItem value="flexible">Flexible / Not sure yet</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Geographic Preference</Label>
                <Select value={form.geographicPreference} onValueChange={v => set("geographicPreference", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Where do you want to go?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Los Angeles / Southern California">Los Angeles / Southern California</SelectItem>
                    <SelectItem value="San Francisco Bay Area / Northern California">SF Bay Area / Northern California</SelectItem>
                    <SelectItem value="San Diego">San Diego</SelectItem>
                    <SelectItem value="Central Valley">Central Valley</SelectItem>
                    <SelectItem value="Anywhere in California">Anywhere in California</SelectItem>
                    <SelectItem value="Open to out of state">Open to out of state</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Financial Situation</Label>
                <Select value={form.financialSituation} onValueChange={v => set("financialSituation", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Describe your financial situation" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low income — rely heavily on financial aid and scholarships">Low income — heavily reliant on financial aid</SelectItem>
                    <SelectItem value="moderate — some financial aid, looking for scholarships">Moderate — some financial aid needed</SelectItem>
                    <SelectItem value="comfortable — loans are okay, scholarships preferred">Comfortable — loans okay, scholarships preferred</SelectItem>
                    <SelectItem value="no financial concerns — cost is not a limiting factor">No financial concerns</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Save */}
          <div className="flex gap-3 justify-end">
            <Button onClick={handleSave} disabled={saving} className="bg-slate-900 hover:bg-slate-700 border-2 border-slate-900 rounded-none">
              {saving ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</>
              ) : (
                <><Save className="mr-2 h-4 w-4" /> Save &amp; Continue <ArrowRight className="ml-1 h-4 w-4" /></>
              )}
            </Button>
          </div>

          <p className="text-xs text-slate-400 text-center">
            This information is used only to generate personalized recommendations. DYP is not an official advisor.
            Verify all requirements with your community college counselor.
          </p>
        </div>
      </main>
    </div>
  );
}
