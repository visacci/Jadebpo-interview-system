import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { UserPlus, Search, Play, Users, CheckCircle, Clock } from "lucide-react";

export default function InterviewSetup() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"eligible" | "manual">("eligible");
  const [selectedApplicationId, setSelectedApplicationId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [departmentId, setDepartmentId] = useState("");

  const { data: profile } = useQuery({
    queryKey: ["my-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user?.id,
  });

  const myName = profile?.full_name || user?.email || "HR User";

  const { data: activeSessions } = useQuery({
    queryKey: ["active-sessions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("interview_sessions")
        .select("*, candidates(name, departments(name)), interview_participants(user_id, user_name, status)")
        .eq("status", "in_progress")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    refetchInterval: 5000,
  });

  // Applicants who completed aptitude test (eligible for interview)
  const { data: eligibleApplicants } = useQuery({
    queryKey: ["eligible-applicants"],
    queryFn: async () => {
      const { data } = await supabase
        .from("applications")
        .select("*, jobs(title, department_id, departments(name))")
        .eq("status", "invited")
        .eq("aptitude_status", "completed")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  // Applicants who haven't completed aptitude test yet
  const { data: pendingAptitudeApplicants } = useQuery({
    queryKey: ["pending-aptitude-applicants"],
    queryFn: async () => {
      const { data } = await supabase
        .from("applications")
        .select("*, jobs(title, departments(name))")
        .eq("status", "invited")
        .eq("aptitude_status", "pending")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: existingCandidateAppIds } = useQuery({
    queryKey: ["existing-candidate-app-ids"],
    queryFn: async () => {
      const { data } = await supabase.from("candidates").select("application_id").not("application_id", "is", null);
      return (data ?? []).map((c) => c.application_id);
    },
  });

  const availableEligible = eligibleApplicants?.filter(
    (a) => !existingCandidateAppIds?.includes(a.id)
  ) ?? [];

  const filteredEligible = searchQuery.trim()
    ? availableEligible.filter(
        (a) =>
          a.applicant_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : availableEligible;

  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data } = await supabase.from("departments").select("*").order("name");
      return data ?? [];
    },
  });

  const selectedApp = availableEligible?.find((a) => a.id === selectedApplicationId);

  const startMutation = useMutation({
    mutationFn: async () => {
      let candidateName: string;
      let candidateAge: number;
      let candidateDeptId: string;
      let applicationId: string | null = null;

      if (mode === "eligible" && selectedApp) {
        candidateName = selectedApp.applicant_name;
        candidateAge = selectedApp.age;
        candidateDeptId = (selectedApp as any).jobs?.department_id;
        applicationId = selectedApp.id;
      } else {
        candidateName = name;
        candidateAge = parseInt(age);
        candidateDeptId = departmentId;
      }

      const { data: candidate, error } = await supabase
        .from("candidates")
        .insert({ name: candidateName, age: candidateAge, department_id: candidateDeptId, application_id: applicationId })
        .select()
        .single();
      if (error) throw error;

      const { data: session, error: sessErr } = await supabase
        .from("interview_sessions")
        .insert({ candidate_id: candidate.id, started_by: user!.id })
        .select()
        .single();
      if (sessErr) throw sessErr;

      await supabase.from("interview_participants").insert({
        session_id: session.id, user_id: user!.id, user_name: myName,
      });

      return session;
    },
    onSuccess: (session) => {
      toast.success("Interview session created!");
      navigate(`/interview/session/${session.id}`);
    },
    onError: () => toast.error("Failed to start interview"),
  });

  const joinMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase.from("interview_participants").upsert({
        session_id: sessionId, user_id: user!.id, user_name: myName,
      }, { onConflict: "session_id,user_id" });
      if (error) throw error;
      return sessionId;
    },
    onSuccess: (sessionId) => {
      toast.success("Joined interview session!");
      navigate(`/interview/session/${sessionId}`);
    },
    onError: () => toast.error("Failed to join session"),
  });

  const canStartEligible = !!selectedApplicationId;
  const canStartManual = name.trim() && age && parseInt(age) > 0 && departmentId;

  const myActiveSessions = activeSessions?.filter(
    (s: any) => !s.interview_participants?.some((p: any) => p.user_id === user?.id)
  ) ?? [];

  const myJoinedSessions = activeSessions?.filter(
    (s: any) => s.interview_participants?.some((p: any) => p.user_id === user?.id)
  ) ?? [];

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6 animate-slide-up">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Interview Center</h1>
          <p className="text-muted-foreground">Start a new interview or join an active session</p>
        </div>

        {/* Active sessions to rejoin */}
        {myJoinedSessions.length > 0 && (
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Play className="h-4 w-4 text-primary" /> Your Active Sessions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {myJoinedSessions.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between bg-secondary/50 rounded-lg p-3">
                  <div>
                    <p className="font-medium text-foreground">{s.candidates?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.candidates?.departments?.name} · {s.interview_participants?.length} interviewer(s)
                    </p>
                  </div>
                  <Button size="sm" onClick={() => navigate(`/interview/session/${s.id}`)}>Continue</Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Sessions available to join */}
        {myActiveSessions.length > 0 && (
          <Card className="border-success/30">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-success" /> Join Active Sessions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {myActiveSessions.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between bg-secondary/50 rounded-lg p-3">
                  <div>
                    <p className="font-medium text-foreground">{s.candidates?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.candidates?.departments?.name} · Started by: {s.interview_participants?.find((p: any) => p.user_id === s.started_by)?.user_name ?? "Super HR"}
                    </p>
                    <div className="flex gap-1 mt-1">
                      {s.interview_participants?.map((p: any) => (
                        <Badge key={p.user_id} variant="secondary" className="text-xs">{p.user_name}</Badge>
                      ))}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => joinMutation.mutate(s.id)} disabled={joinMutation.isPending}>
                    Join
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Pending aptitude tests */}
        {(pendingAptitudeApplicants?.length ?? 0) > 0 && (
          <Card className="border-warning/30">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4 text-warning" /> Awaiting Aptitude Test ({pendingAptitudeApplicants?.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {pendingAptitudeApplicants?.map((a) => (
                <div key={a.id} className="flex items-center justify-between bg-secondary/50 rounded-lg p-3">
                  <div>
                    <p className="font-medium text-foreground">{a.applicant_name}</p>
                    <p className="text-xs text-muted-foreground">{(a as any).jobs?.title} · {(a as any).jobs?.departments?.name}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs">Pending Test</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Start new interview */}
        <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
          <TabsList className="w-full">
            <TabsTrigger value="eligible" className="flex-1">
              Eligible Applicants
              {availableEligible.length > 0 && (
                <Badge variant="default" className="ml-2 text-xs">{availableEligible.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex-1">Manual Entry</TabsTrigger>
          </TabsList>

          <TabsContent value="eligible" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-success" /> Applicants Who Completed Aptitude Test
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Search by name or email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>

                {filteredEligible.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {searchQuery.trim() ? "No matching applicants found" : "No eligible applicants (aptitude test must be completed first)"}
                  </p>
                ) : (
                  <Select value={selectedApplicationId} onValueChange={setSelectedApplicationId}>
                    <SelectTrigger><SelectValue placeholder="Select an applicant" /></SelectTrigger>
                    <SelectContent>
                      {filteredEligible.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.applicant_name} — {(a as any).jobs?.title} ({(a as any).jobs?.departments?.name}) — Aptitude: {a.aptitude_score ?? 0}%
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {selectedApp && (
                  <div className="mt-3 bg-secondary/50 rounded-lg p-3 text-sm space-y-1">
                    <p><span className="text-muted-foreground">Name:</span> {selectedApp.applicant_name}</p>
                    <p><span className="text-muted-foreground">Age:</span> {selectedApp.age}</p>
                    <p><span className="text-muted-foreground">Email:</span> {selectedApp.email}</p>
                    <p><span className="text-muted-foreground">Phone:</span> {selectedApp.phone}</p>
                    <p><span className="text-muted-foreground">Department:</span> {(selectedApp as any).jobs?.departments?.name}</p>
                    <p><span className="text-muted-foreground">Aptitude Score:</span> <span className="font-medium">{selectedApp.aptitude_score ?? 0}%</span></p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manual" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-primary" /> Candidate Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Candidate Name</Label>
                  <Input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Age</Label>
                  <Input type="number" placeholder="Age" min={18} max={99} value={age} onChange={(e) => setAge(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select value={departmentId} onValueChange={setDepartmentId}>
                    <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                    <SelectContent>
                      {departments?.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Button className="w-full" size="lg"
          disabled={!(mode === "eligible" ? canStartEligible : canStartManual) || startMutation.isPending}
          onClick={() => startMutation.mutate()}>
          {startMutation.isPending ? "Starting..." : "Start Interview (as Super HR)"}
        </Button>
      </div>
    </Layout>
  );
}
