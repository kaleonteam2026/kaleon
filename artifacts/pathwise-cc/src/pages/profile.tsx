import { useEffect, useState } from "react";
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
import { Save, ArrowRight, Loader2 } from "lucide-react";

const COLLEGES = [
  "Los Angeles City College", "Santa Monica College", "East Los Angeles College",
  "Los Angeles Valley College", "Glendale Community College", "Pasadena City College",
  "Long Beach City College", "Cerritos College", "Citrus College",
  "Fullerton College", "Irvine Valley College", "Saddleback College",
  "San Diego City College", "Grossmont College", "Palomar College",
  "City College of San Francisco", "De Anza College", "Foothill College",
  "Diablo Valley College", "Laney College", "Merritt College",
  "Sacramento City College", "Fresno City College", "Bakersfield College",
  "Riverside City College", "San Bernardino Valley College", "Chaffey College",
  "Mt. San Antonio College", "Rio Hondo College", "El Camino College",
  "Other",
];

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
      // Check if user already has a profile
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav profileId={form.id} />
      <main className="pt-14 px-4 md:px-8 max-w-3xl mx-auto">
        <div className="py-8">
          <h1 className="text-2xl font-bold text-slate-900">Student Profile</h1>
          <p className="text-slate-500 text-sm mt-1">Complete your profile to get personalized transfer pathway recommendations.</p>
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
                <Select value={form.communityCollege} onValueChange={v => set("communityCollege", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your college" />
                  </SelectTrigger>
                  <SelectContent>
                    {COLLEGES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

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
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {saving ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</>
              ) : (
                <><Save className="mr-2 h-4 w-4" /> Save &amp; Continue <ArrowRight className="ml-1 h-4 w-4" /></>
              )}
            </Button>
          </div>

          {/* Disclaimer */}
          <p className="text-xs text-slate-400 text-center">
            This information is used only to generate personalized recommendations. Pathwise CC is not an official advisor.
            Verify all requirements with your community college counselor.
          </p>
        </div>
      </main>
    </div>
  );
}
