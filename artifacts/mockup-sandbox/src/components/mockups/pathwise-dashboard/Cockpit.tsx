import React from "react";
import { 
  AlertCircle, 
  BarChart2, 
  BookOpen, 
  Briefcase, 
  CheckCircle2, 
  ChevronRight, 
  Compass, 
  FileText, 
  GraduationCap, 
  LineChart, 
  Map, 
  Percent, 
  Settings, 
  Target, 
  User, 
  Zap,
  Info
} from "lucide-react";

const PROFILE = {
  fullName: "Maria",
  communityCollege: "De Anza College",
  intendedMajor: "Computer Science",
  careerGoal: "Software Engineer",
  currentGpa: 3.7
};

const SUMMARY = {
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

const READINESS = {
  profile: { score: 15, max: 20 },
  gpa: { score: 22, max: 25 },
  units: { score: 18, max: 25 },
  pathway: { score: 12, max: 15 },
  guidebook: { score: 3, max: 5 },
  progress: { score: 7, max: 10 },
  totalUnits: { score: 43, max: 60 }
};

const ROADMAP_ITEMS = [
  { title: "My Profile", icon: User, status: "Active", metric: "75%" },
  { title: "My Courses", icon: BookOpen, status: "Active", metric: "8 Logged" },
  { title: "Transfer Targets", icon: Target, status: "Active", metric: "1 Saved" },
  { title: "AI Pathways", icon: Map, status: "Action Needed", metric: "2 Saved" },
  { title: "Scholarships", icon: Percent, status: "Not Started", metric: "0 Applied" },
  { title: "My Progress", icon: LineChart, status: "Active", metric: "On Track" },
  { title: "Internship Finder", icon: Briefcase, status: "Not Started", metric: "Explore" },
];

export function Cockpit() {
  return (
    <div className="min-h-screen bg-[#f4f4f5] text-slate-900 font-sans selection:bg-slate-300">
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');
        .font-mono { font-family: 'JetBrains Mono', monospace; }
        .font-sans { font-family: 'Inter', sans-serif; }
      `}} />
      
      <div className="max-w-[1280px] mx-auto p-6 grid grid-cols-12 gap-6">
        
        {/* Header Section */}
        <header className="col-span-12 flex justify-between items-end border-b-2 border-slate-900 pb-4 mb-2">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 uppercase">Mission Control</h1>
            <p className="text-lg text-slate-600 mt-1">Welcome back, {PROFILE.fullName} — System ready.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right flex flex-col items-end">
              <span className="text-xs font-mono text-slate-500 uppercase">Est. Transfer Date</span>
              <span className="font-mono font-bold">Fall 2025</span>
            </div>
            <div className="h-10 w-10 bg-slate-900 rounded flex items-center justify-center text-white">
              <User size={20} />
            </div>
          </div>
        </header>

        {/* Left Column: Sidebar & Actions (3 cols) */}
        <div className="col-span-3 flex flex-col gap-6">
          
          {/* Profile Card */}
          <div className="bg-white border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] p-5">
            <div className="flex items-center justify-between mb-4 border-b-2 border-slate-100 pb-3">
              <h2 className="font-bold uppercase tracking-wider text-sm flex items-center gap-2">
                <Settings size={16} /> User Profile
              </h2>
              <button className="text-xs font-mono underline hover:text-blue-600">Edit</button>
            </div>
            
            <div className="space-y-4 text-sm">
              <div>
                <div className="text-xs font-mono text-slate-500 mb-1">Institution</div>
                <div className="font-medium">{PROFILE.communityCollege}</div>
              </div>
              <div>
                <div className="text-xs font-mono text-slate-500 mb-1">Target Major</div>
                <div className="font-medium">{PROFILE.intendedMajor}</div>
              </div>
              <div>
                <div className="text-xs font-mono text-slate-500 mb-1">Career Goal</div>
                <div className="font-medium">{PROFILE.careerGoal}</div>
              </div>
              <div>
                <div className="text-xs font-mono text-slate-500 mb-1">Top Match</div>
                <div className="font-medium flex items-center gap-2">
                  {SUMMARY.topMatchUniversity} 
                  <span className="bg-slate-900 text-white text-xs px-1.5 py-0.5 rounded font-mono">{SUMMARY.topMatchScore}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Next Steps List */}
          <div className="bg-white border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] p-5 flex-grow">
            <h2 className="font-bold uppercase tracking-wider text-sm flex items-center gap-2 mb-4">
              <Zap size={16} /> Urgent Actions
            </h2>
            <div className="space-y-3">
              {SUMMARY.nextActions.map((action, i) => (
                <div key={i} className="group flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded cursor-pointer hover:bg-red-100 transition-colors">
                  <AlertCircle size={16} className="text-red-600 mt-0.5 shrink-0" />
                  <span className="text-sm font-medium text-red-900 leading-tight">{action}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Center Column: Radar & Stats (6 cols) */}
        <div className="col-span-6 flex flex-col gap-6">
          
          {/* Readiness Radar */}
          <div className="bg-slate-900 text-white p-6 border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-bold uppercase tracking-wider text-sm text-slate-400 flex items-center gap-2">
                <Compass size={16} /> Readiness Radar
              </h2>
              <div className="bg-emerald-500 text-slate-900 font-mono text-xs px-2 py-1 font-bold uppercase">
                {SUMMARY.readinessLabel}
              </div>
            </div>

            <div className="flex items-center gap-8 mb-8">
              <div className="relative w-40 h-40 flex items-center justify-center shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="10" />
                  <circle 
                    cx="50" cy="50" r="45" fill="none" stroke="#10b981" strokeWidth="10" 
                    strokeDasharray={`${(SUMMARY.readinessScore / 100) * 283} 283`}
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-mono font-bold leading-none">{SUMMARY.readinessScore}</span>
                  <span className="text-xs text-slate-400 uppercase tracking-widest mt-1">Score</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 w-full">
                {[
                  { label: "Profile", ...READINESS.profile },
                  { label: "GPA", ...READINESS.gpa },
                  { label: "Units", ...READINESS.units },
                  { label: "Pathway", ...READINESS.pathway },
                  { label: "Guidebook", ...READINESS.guidebook },
                  { label: "Progress", ...READINESS.progress }
                ].map((item, i) => (
                  <div key={i} className="flex flex-col gap-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400 uppercase tracking-wider">{item.label}</span>
                      <span className="font-mono text-slate-300">{item.score}/{item.max}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-slate-300" 
                        style={{ width: `${(item.score / item.max) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex justify-between items-center border-t border-slate-800 pt-4 mt-2">
              <span className="text-xs text-slate-400 font-mono">TOTAL TRANSFERABLE UNITS</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-lg">{READINESS.totalUnits.score}</span>
                <span className="text-slate-500">/</span>
                <span className="font-mono text-slate-400">{READINESS.totalUnits.max} Required</span>
              </div>
            </div>
          </div>

          {/* Stat Tiles Grid */}
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white border-2 border-slate-900 p-4 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
              <div className="text-xs font-mono text-slate-500 uppercase mb-2">Est. GPA</div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-mono font-bold">{SUMMARY.estimatedGpa}</span>
                <span className="text-xs text-slate-500">Current: {PROFILE.currentGpa}</span>
              </div>
            </div>
            
            <div className="bg-white border-2 border-slate-900 p-4 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
              <div className="text-xs font-mono text-slate-500 uppercase mb-2">Courses Logged</div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-mono font-bold">{SUMMARY.totalCourses}</span>
                <span className="text-xs text-slate-500">{SUMMARY.completedCourses} Done, {SUMMARY.inProgressCourses} IP</span>
              </div>
            </div>

            <div className="bg-white border-2 border-slate-900 p-4 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
              <div className="text-xs font-mono text-slate-500 uppercase mb-2">Profile Complete</div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-mono font-bold">{SUMMARY.profileCompletionPercent}%</span>
              </div>
            </div>

            <div className="bg-white border-2 border-slate-900 p-4 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] bg-blue-50 border-blue-900">
              <div className="text-xs font-mono text-blue-800 uppercase mb-2">AI Pathways</div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-mono font-bold text-blue-900">{SUMMARY.savedPathwaysCount}</span>
                <span className="text-xs text-blue-700">Saved</span>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Roadmap & Disclaimer (3 cols) */}
        <div className="col-span-3 flex flex-col gap-6">
          
          {/* Roadmap Table */}
          <div className="bg-white border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] p-0 overflow-hidden flex-grow flex flex-col">
            <div className="p-4 border-b-2 border-slate-900 bg-slate-50">
              <h2 className="font-bold uppercase tracking-wider text-sm flex items-center gap-2">
                <FileText size={16} /> CC Success Modules
              </h2>
            </div>
            
            <div className="flex-grow flex flex-col">
              {ROADMAP_ITEMS.map((item, i) => (
                <div key={i} className="flex items-center p-3 border-b border-slate-100 last:border-b-0 hover:bg-slate-50 cursor-pointer transition-colors group">
                  <div className="h-8 w-8 rounded bg-slate-100 flex items-center justify-center mr-3 text-slate-600 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                    <item.icon size={14} />
                  </div>
                  <div className="flex-grow">
                    <div className="text-sm font-medium">{item.title}</div>
                    <div className="text-xs font-mono text-slate-500 flex items-center gap-1">
                      <span className={
                        item.status === 'Active' ? 'text-green-600' : 
                        item.status === 'Action Needed' ? 'text-amber-600' : 'text-slate-400'
                      }>●</span>
                      {item.status}
                    </div>
                  </div>
                  <div className="text-xs font-mono text-slate-400 text-right">
                    {item.metric}
                    <ChevronRight size={14} className="inline ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Disclaimer */}
          <div className="bg-slate-200 border border-slate-300 p-4 rounded text-xs text-slate-600 flex gap-3">
            <Info size={16} className="shrink-0 text-slate-500" />
            <p className="leading-relaxed">
              <strong className="font-mono uppercase text-[10px] tracking-wider block mb-1">System Disclaimer</strong>
              Scores and GPA estimates are AI-generated based on current inputs and historic transfer data. Always verify requirements directly with counselors or ASSIST.org.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
