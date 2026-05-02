import React from "react";
import { 
  CheckCircle2, 
  ChevronRight, 
  GraduationCap, 
  Map, 
  Trophy, 
  BookOpen, 
  Compass, 
  Briefcase,
  AlertCircle,
  ArrowRight
} from "lucide-react";

const profile = { 
  fullName: "Maria", 
  communityCollege: "De Anza College", 
  intendedMajor: "Computer Science", 
  careerGoal: "Software Engineer", 
  currentGpa: 3.7 
};

const summary = { 
  profileCompletionPercent: 75, 
  totalCourses: 8, 
  completedCourses: 5, 
  inProgressCourses: 3, 
  estimatedGpa: 3.65, 
  savedPathwaysCount: 2, 
  guidebooksCount: 1, 
  topMatchUniversity: "UC Berkeley", 
  topMatchScore: 87, 
  readinessScore: 72, 
  readinessLabel: "On Track", 
  nextActions: [
    "Submit TAG application by Sept 30", 
    "Add Math 1B to your courses", 
    "Review IGETC Area 3 requirements"
  ] 
};

const readinessBreakdown = { 
  profile: { score: 15, max: 20 }, 
  gpa: { score: 22, max: 25 }, 
  units: { score: 18, max: 25 }, 
  pathway: { score: 12, max: 15 }, 
  guidebook: { score: 3, max: 5 }, 
  progress: { score: 7, max: 10 }, 
  totalUnits: { score: 43, max: 60 } 
};

const roadmapItems = [
  { title: "My Profile", icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />, desc: "75% complete" },
  { title: "My Courses", icon: <BookOpen className="w-5 h-5 text-indigo-400" />, desc: "8 logged" },
  { title: "Transfer Targets", icon: <Trophy className="w-5 h-5 text-amber-500" />, desc: "UC Berkeley top match" },
  { title: "AI Pathways", icon: <Map className="w-5 h-5 text-rose-400" />, desc: "2 saved routes" },
  { title: "Scholarships", icon: <GraduationCap className="w-5 h-5 text-blue-400" />, desc: "3 recommended" },
  { title: "My Progress", icon: <Compass className="w-5 h-5 text-teal-500" />, desc: "On Track" },
  { title: "Internship Finder", icon: <Briefcase className="w-5 h-5 text-slate-500" />, desc: "Explore roles" },
];

export function Feed() {
  return (
    <div className="min-h-screen bg-[#FDFCFB] text-slate-800 font-sans selection:bg-rose-100 selection:text-rose-900">
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap');
        .font-serif { font-family: 'Playfair Display', serif; }
        .font-sans { font-family: 'Inter', sans-serif; }
      `}} />

      <div className="max-w-[1280px] mx-auto px-6 py-12 flex flex-col lg:flex-row gap-12">
        
        {/* Main Feed Column */}
        <div className="flex-1 max-w-3xl">
          
          <header className="mb-12">
            <h1 className="font-serif text-5xl text-slate-900 mb-4 tracking-tight">
              Welcome back, {profile.fullName}!
            </h1>
            <p className="text-xl text-slate-500 font-light max-w-2xl leading-relaxed">
              You're currently {summary.readinessLabel.toLowerCase()} with your transfer goals. Here is what's happening with your roadmap today.
            </p>
          </header>

          <div className="space-y-8">
            
            {/* Feed Item: Next Steps */}
            <div className="bg-white rounded-2xl p-8 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-slate-100 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-rose-300"></div>
              <h2 className="font-serif text-2xl text-slate-900 mb-6 flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-rose-400" />
                Suggested Next Steps
              </h2>
              <div className="space-y-4">
                {summary.nextActions.map((action, i) => (
                  <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-rose-50/50 hover:bg-rose-50 transition-colors border border-rose-100/50 cursor-pointer">
                    <div className="mt-0.5">
                      <div className="w-5 h-5 rounded-full border-2 border-rose-300 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-rose-400 opacity-0 hover:opacity-100 transition-opacity"></div>
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-slate-700 font-medium">{action}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-rose-300" />
                  </div>
                ))}
              </div>
            </div>

            {/* Feed Item: Readiness Score */}
            <div className="bg-white rounded-2xl p-8 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-slate-100">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="font-serif text-2xl text-slate-900 mb-2">Transfer Readiness</h2>
                  <p className="text-slate-500">Based on your academic profile and targets</p>
                </div>
                <div className="text-right">
                  <div className="text-5xl font-serif text-emerald-600 mb-1">{summary.readinessScore}</div>
                  <div className="text-sm font-medium text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full inline-block">
                    {summary.readinessLabel}
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                {[
                  { label: "Profile Setup", current: readinessBreakdown.profile.score, max: readinessBreakdown.profile.max, color: "bg-blue-400" },
                  { label: "GPA Strength", current: readinessBreakdown.gpa.score, max: readinessBreakdown.gpa.max, color: "bg-emerald-400" },
                  { label: "Unit Progress", current: readinessBreakdown.units.score, max: readinessBreakdown.units.max, color: "bg-indigo-400" },
                  { label: "Pathway Alignment", current: readinessBreakdown.pathway.score, max: readinessBreakdown.pathway.max, color: "bg-rose-400" },
                ].map((item, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-600 font-medium">{item.label}</span>
                      <span className="text-slate-400">{item.current} / {item.max}</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={\`h-full \${item.color} rounded-full\`}
                        style={{ width: \`\${(item.current / item.max) * 100}%\` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Feed Item: Roadmap */}
            <div className="bg-white rounded-2xl p-8 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-slate-100">
              <h2 className="font-serif text-2xl text-slate-900 mb-6 flex items-center gap-3">
                <Map className="w-6 h-6 text-indigo-400" />
                CC Success Roadmap
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {roadmapItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all cursor-pointer group">
                    <div className="p-3 bg-slate-50 rounded-lg group-hover:bg-white transition-colors">
                      {item.icon}
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-800">{item.title}</h3>
                      <p className="text-sm text-slate-500">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs text-slate-400 text-center py-4 flex items-center justify-center gap-2">
              <AlertCircle className="w-3 h-3" />
              Disclaimer: AI estimates, matches, and pathways are for planning purposes. Always consult a counselor.
            </p>

          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-full lg:w-80 flex-shrink-0 space-y-8">
          
          {/* Profile Card */}
          <div className="bg-[#FAF8F5] rounded-3xl p-6 border border-[#F0EBE1]">
            <div className="w-20 h-20 bg-rose-100 rounded-2xl mb-6 flex items-center justify-center text-rose-500 font-serif text-3xl shadow-sm">
              {profile.fullName.charAt(0)}
            </div>
            <h3 className="font-serif text-2xl text-slate-900 mb-1">{profile.fullName}</h3>
            <p className="text-slate-500 mb-6">{profile.communityCollege}</p>
            
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">Intended Major</p>
                <p className="text-slate-800 font-medium">{profile.intendedMajor}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">Career Goal</p>
                <p className="text-slate-800 font-medium">{profile.careerGoal}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">Current GPA</p>
                <p className="text-slate-800 font-medium">{profile.currentGpa.toFixed(2)}</p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-[#F0EBE1]">
              <button className="w-full py-2.5 px-4 bg-white border border-[#E8E2D5] rounded-xl text-slate-700 font-medium hover:bg-slate-50 transition-colors flex items-center justify-between group">
                Edit Profile
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
              </button>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
              <p className="text-xs text-slate-500 mb-2 font-medium">Est. GPA</p>
              <p className="font-serif text-2xl text-slate-800">{summary.estimatedGpa.toFixed(2)}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
              <p className="text-xs text-slate-500 mb-2 font-medium">Courses</p>
              <p className="font-serif text-2xl text-slate-800">{summary.totalCourses}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
              <p className="text-xs text-slate-500 mb-2 font-medium">Pathways</p>
              <p className="font-serif text-2xl text-slate-800">{summary.savedPathwaysCount}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
              <p className="text-xs text-slate-500 mb-2 font-medium">Profile</p>
              <p className="font-serif text-2xl text-slate-800">{summary.profileCompletionPercent}%</p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
