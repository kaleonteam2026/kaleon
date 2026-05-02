import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronRight, 
  BookOpen, 
  TrendingUp, 
  Target, 
  Map, 
  GraduationCap, 
  Briefcase, 
  Award,
  AlertCircle,
  Clock,
  User
} from "lucide-react";

// Mock Data
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
  { title: "My Profile", icon: User, color: "bg-blue-100 text-blue-700" },
  { title: "My Courses", icon: BookOpen, color: "bg-emerald-100 text-emerald-700" },
  { title: "Transfer Targets", icon: Target, color: "bg-purple-100 text-purple-700" },
  { title: "AI Pathways", icon: Map, color: "bg-amber-100 text-amber-700" },
  { title: "Scholarships", icon: Award, color: "bg-rose-100 text-rose-700" },
  { title: "My Progress", icon: TrendingUp, color: "bg-indigo-100 text-indigo-700" },
  { title: "Internship Finder", icon: Briefcase, color: "bg-teal-100 text-teal-700" },
];

export function Scorecard() {
  return (
    <div className="min-h-screen bg-neutral-50" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style dangerouslySetInnerHTML={{ __html: `
        .font-outfit { font-family: 'Outfit', sans-serif; }
      `}} />
      
      {/* Top Header */}
      <header className="bg-white border-b px-8 py-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-black text-white flex items-center justify-center font-outfit font-bold text-lg">P</div>
            <span className="font-outfit font-bold text-xl tracking-tight">Pathwise</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" className="hidden sm:flex">Help</Button>
            <div className="w-10 h-10 rounded-full bg-neutral-200 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center">
              <span className="font-outfit font-bold text-neutral-600">M</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Main Content */}
          <div className="flex-1 space-y-8">
            
            {/* Hero / Readiness Score */}
            <div className="bg-black text-white rounded-3xl p-8 sm:p-10 relative overflow-hidden shadow-xl">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500 rounded-full blur-3xl opacity-20 -mr-20 -mt-20 pointer-events-none"></div>
              
              <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-8">
                <div>
                  <h1 className="font-outfit text-4xl sm:text-5xl font-bold mb-2">
                    Welcome back, {profile.fullName}!
                  </h1>
                  <p className="text-neutral-400 text-lg">
                    Here's your transfer readiness report.
                  </p>
                </div>
                
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 text-center border border-white/20 min-w-[200px]">
                  <div className="text-emerald-400 font-outfit font-bold text-sm tracking-widest uppercase mb-1">
                    Readiness Score
                  </div>
                  <div className="font-outfit text-6xl font-bold text-white mb-2">
                    {summary.readinessScore}
                  </div>
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30">
                    {summary.readinessLabel}
                  </Badge>
                </div>
              </div>

              {/* Breakdown Mini-Bars */}
              <div className="mt-8 pt-8 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Profile", data: readinessBreakdown.profile },
                  { label: "GPA", data: readinessBreakdown.gpa },
                  { label: "Units", data: readinessBreakdown.units },
                  { label: "Pathway", data: readinessBreakdown.pathway }
                ].map(item => (
                  <div key={item.label}>
                    <div className="flex justify-between text-xs mb-1.5 text-neutral-400 font-medium uppercase tracking-wider">
                      <span>{item.label}</span>
                      <span>{item.data.score}/{item.data.max}</span>
                    </div>
                    <Progress value={(item.data.score / item.data.max) * 100} className="h-1.5 bg-white/10" />
                  </div>
                ))}
              </div>
            </div>

            {/* Stat Tiles */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border-0 shadow-sm rounded-2xl bg-white overflow-hidden group hover:shadow-md transition-shadow">
                <CardContent className="p-5 relative">
                  <div className="absolute right-0 top-0 w-16 h-16 bg-blue-50 rounded-bl-3xl -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                  <p className="text-sm font-medium text-neutral-500 mb-1 relative z-10">Profile</p>
                  <div className="flex items-end gap-2 relative z-10">
                    <span className="font-outfit text-3xl font-bold">{summary.profileCompletionPercent}%</span>
                  </div>
                  <Progress value={summary.profileCompletionPercent} className="h-1 mt-3 bg-blue-100" />
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm rounded-2xl bg-white overflow-hidden group hover:shadow-md transition-shadow">
                <CardContent className="p-5 relative">
                  <div className="absolute right-0 top-0 w-16 h-16 bg-emerald-50 rounded-bl-3xl -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                  <p className="text-sm font-medium text-neutral-500 mb-1 relative z-10">Courses</p>
                  <div className="flex items-end gap-2 relative z-10">
                    <span className="font-outfit text-3xl font-bold">{summary.completedCourses}</span>
                    <span className="text-sm text-neutral-400 mb-1">/{summary.totalCourses}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm rounded-2xl bg-white overflow-hidden group hover:shadow-md transition-shadow">
                <CardContent className="p-5 relative">
                  <div className="absolute right-0 top-0 w-16 h-16 bg-purple-50 rounded-bl-3xl -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                  <p className="text-sm font-medium text-neutral-500 mb-1 relative z-10">Est. GPA</p>
                  <div className="flex items-end gap-2 relative z-10">
                    <span className="font-outfit text-3xl font-bold text-purple-700">{summary.estimatedGpa}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm rounded-2xl bg-white overflow-hidden group hover:shadow-md transition-shadow">
                <CardContent className="p-5 relative">
                  <div className="absolute right-0 top-0 w-16 h-16 bg-amber-50 rounded-bl-3xl -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                  <p className="text-sm font-medium text-neutral-500 mb-1 relative z-10">AI Pathways</p>
                  <div className="flex items-end gap-2 relative z-10">
                    <span className="font-outfit text-3xl font-bold text-amber-600">{summary.savedPathwaysCount}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* CC Success Roadmap */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-outfit text-2xl font-bold text-neutral-900">Success Roadmap</h2>
                <Button variant="link" className="text-blue-600 font-medium">View All <ChevronRight className="w-4 h-4 ml-1" /></Button>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {roadmapItems.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <Card key={i} className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer group rounded-2xl">
                      <CardContent className="p-5 flex flex-col items-center text-center gap-3">
                        <div className={"w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform " + item.color}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <span className="font-medium text-sm text-neutral-700">{item.title}</span>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Disclaimer */}
            <div className="flex gap-3 items-start bg-neutral-100 p-4 rounded-xl text-neutral-500 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p>
                <strong>AI Estimation Disclaimer:</strong> GPA and transfer readiness scores are estimates based on logged courses and stated goals. Always verify requirements with an academic counselor.
              </p>
            </div>

          </div>

          {/* Sidebar */}
          <div className="w-full lg:w-80 space-y-6">
            
            {/* Profile Card */}
            <Card className="border-0 shadow-sm rounded-2xl overflow-hidden">
              <div className="h-24 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
              <CardContent className="p-6 pt-0 relative">
                <div className="w-20 h-20 rounded-2xl bg-white p-1 absolute -top-10 shadow-sm">
                  <div className="w-full h-full rounded-xl bg-neutral-100 flex items-center justify-center">
                    <GraduationCap className="w-8 h-8 text-neutral-400" />
                  </div>
                </div>
                
                <div className="mt-12">
                  <h3 className="font-outfit text-xl font-bold text-neutral-900">{profile.fullName}</h3>
                  <p className="text-neutral-500 text-sm mb-4">{profile.communityCollege}</p>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 bg-neutral-50 p-3 rounded-lg">
                      <Target className="w-5 h-5 text-indigo-500" />
                      <div>
                        <div className="text-xs text-neutral-500 font-medium">Major</div>
                        <div className="font-medium text-sm text-neutral-900">{profile.intendedMajor}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 bg-neutral-50 p-3 rounded-lg">
                      <Briefcase className="w-5 h-5 text-emerald-500" />
                      <div>
                        <div className="text-xs text-neutral-500 font-medium">Career</div>
                        <div className="font-medium text-sm text-neutral-900">{profile.careerGoal}</div>
                      </div>
                    </div>
                  </div>
                  
                  <Button className="w-full mt-4 font-medium rounded-xl" variant="outline">
                    Edit Profile
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Next Steps */}
            <Card className="border-0 shadow-sm rounded-2xl bg-blue-50/50">
              <CardHeader className="pb-4">
                <CardTitle className="font-outfit text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  Next Actions
                </CardTitle>
                <CardDescription>Stay on track for transfer</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {summary.nextActions.map((action, i) => (
                  <div key={i} className="bg-white p-3.5 rounded-xl flex gap-3 items-start shadow-sm border border-blue-100/50 hover:border-blue-200 transition-colors cursor-pointer group">
                    <div className="mt-0.5">
                      <div className="w-5 h-5 rounded-full border-2 border-neutral-300 group-hover:border-blue-500 transition-colors" />
                    </div>
                    <span className="text-sm font-medium text-neutral-700 leading-snug group-hover:text-blue-900 transition-colors">{action}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </div>
  );
}
