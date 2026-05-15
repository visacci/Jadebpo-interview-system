import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import ScoreSlider from "@/components/ScoreSlider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, CheckCircle, Clock, Users } from "lucide-react";

type Phase = "questions" | "waiting" | "completed";

export default function InterviewFlow() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentQ, setCurrentQ] = useState(0);
  const [phase, setPhase] = useState<Phase>("questions");
  const [questionScores, setQuestionScores] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");
  const [notesLoaded, setNotesLoaded] = useState(false);

  const { data: session, refetch: refetchSession } = useQuery({
    queryKey: ["session", sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("interview_sessions")
        .select("*, candidates(*, departments(name))")
        .eq("id", sessionId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: participants, refetch: refetchParticipants } = useQuery({
    queryKey: ["session-participants", sessionId],
    queryFn: async () => {
      const { data } = await supabase
        .from("interview_participants")
        .select("*")
        .eq("session_id", sessionId!)
        .order("created_at");
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!sessionId) return;
    const channel = supabase
      .channel(`session-${sessionId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "interview_participants", filter: `session_id=eq.${sessionId}` },
        () => { refetchParticipants(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "interview_sessions", filter: `id=eq.${sessionId}` },
        () => { refetchSession(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  useEffect(() => {
    if (session?.status === "completed") setPhase("completed");
  }, [session?.status]);

  const candidate = session?.candidates as any;
  const isSuperHR = session?.started_by === user?.id;
  const myParticipant = participants?.find((p) => p.user_id === user?.id);

  const { data: questions } = useQuery({
    queryKey: ["questions", candidate?.department_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("questions")
        .select("*")
        .eq("department_id", candidate!.department_id)
        .order("order_index");
      if (error) throw error;
      return data;
    },
    enabled: !!candidate?.department_id,
  });

  // Load existing scores
  useEffect(() => {
    if (!sessionId || !user?.id) return;
    supabase.from("interviewer_question_scores").select("question_id, score")
      .eq("session_id", sessionId).eq("user_id", user.id)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const scores: Record<string, number> = {};
          data.forEach((s) => { scores[s.question_id] = s.score; });
          setQuestionScores(scores);
        }
      });
  }, [sessionId, user?.id]);

  // Restore phase from participant status
  useEffect(() => {
    if (myParticipant?.status === "done" && phase !== "completed") {
      setPhase("waiting");
    }
  }, [myParticipant?.status]);

  // Load notes once
  useEffect(() => {
    if (myParticipant && !notesLoaded) {
      setNotes((myParticipant as any).notes ?? "");
      setNotesLoaded(true);
    }
  }, [myParticipant, notesLoaded]);

  // Autosave notes
  useEffect(() => {
    if (!notesLoaded || !sessionId || !user?.id) return;
    const t = setTimeout(() => {
      supabase.from("interview_participants").update({ notes })
        .eq("session_id", sessionId).eq("user_id", user.id);
    }, 700);
    return () => clearTimeout(t);
  }, [notes, notesLoaded, sessionId, user?.id]);

  const currentQuestion = questions?.[currentQ];
  const totalQuestions = questions?.length ?? 0;
  const progress = totalQuestions > 0 ? ((currentQ + 1) / totalQuestions) * 100 : 0;

  const getQScore = (qId: string): number => questionScores[qId] ?? 0;
  const updateQScore = (qId: string, value: number) => setQuestionScores((prev) => ({ ...prev, [qId]: value }));

  const saveQMutation = useMutation({
    mutationFn: async (qId: string) => {
      await supabase.from("interviewer_question_scores").upsert({
        session_id: sessionId!, user_id: user!.id, question_id: qId, score: getQScore(qId),
      }, { onConflict: "session_id,user_id,question_id" });
    },
  });

  // Auto-save
  useEffect(() => {
    if (phase === "questions" && currentQuestion && questionScores[currentQuestion.id] !== undefined) {
      const timeout = setTimeout(() => saveQMutation.mutate(currentQuestion.id), 500);
      return () => clearTimeout(timeout);
    }
  }, [questionScores, currentQuestion?.id, phase]);

  const markDoneMutation = useMutation({
    mutationFn: async () => {
      // Save current question score first
      if (currentQuestion) {
        await supabase.from("interviewer_question_scores").upsert({
          session_id: sessionId!, user_id: user!.id, question_id: currentQuestion.id, score: getQScore(currentQuestion.id),
        }, { onConflict: "session_id,user_id,question_id" });
      }
      // Explicitly save notes AND status together so notes are never lost
      // even if the 700ms autosave debounce hasn't fired yet
      await supabase.from("interview_participants")
        .update({ status: "done", notes })
        .eq("session_id", sessionId!).eq("user_id", user!.id);
    },
    onSuccess: () => {
      setPhase("waiting");
      toast.success("Your scores submitted!");
    },
  });

  // Super HR finishes — compute percentage-based scores
  const finishMutation = useMutation({
    mutationFn: async () => {
      const { data: allQScores } = await supabase.from("interviewer_question_scores").select("question_id, score").eq("session_id", sessionId!);

      const qMaxMap = new Map<string, number>();
      questions?.forEach((q) => { qMaxMap.set(q.id, (q as any).max_marks ?? 10); });

      const questionMap = new Map<string, number[]>();
      allQScores?.forEach((s) => {
        if (!questionMap.has(s.question_id)) questionMap.set(s.question_id, []);
        questionMap.get(s.question_id)!.push(s.score);
      });

      let totalEarned = 0;
      let totalMax = 0;
      for (const [qId, scores] of questionMap) {
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        const maxM = qMaxMap.get(qId) ?? 10;
        totalEarned += avg;
        totalMax += maxM;

        const scoreData: any = {
          candidate_id: candidate.id, question_id: qId,
          interviewer_1_score: scores[0] ?? 0,
          interviewer_2_score: scores[1] ?? 0,
          interviewer_3_score: scores[2] ?? 0,
          final_question_score: avg,
        };
        await supabase.from("scores").upsert(scoreData, { onConflict: "candidate_id,question_id" });
      }

      const interviewPct = totalMax > 0 ? (totalEarned / totalMax) * 100 : 0;

      // Save interviewer names
      const nameEntries: Record<string, string> = {};
      participants?.forEach((p, i) => {
        if (i < 3) nameEntries[`interviewer_${i + 1}_name`] = p.user_name;
      });
      await supabase.from("interviewer_names").upsert({
        candidate_id: candidate.id,
        interviewer_1_name: nameEntries.interviewer_1_name ?? "N/A",
        interviewer_2_name: nameEntries.interviewer_2_name ?? "N/A",
        interviewer_3_name: nameEntries.interviewer_3_name ?? "N/A",
      }, { onConflict: "candidate_id" });

      // Final score: average of aptitude + interview
      let aptitudePct = 0;
      let hasAptitude = false;
      if (candidate.application_id) {
        const { data: app } = await supabase.from("applications").select("aptitude_score").eq("id", candidate.application_id).single();
        if (app && app.aptitude_score != null) {
          aptitudePct = app.aptitude_score;
          hasAptitude = true;
        }
      }

      const finalScore = hasAptitude ? (aptitudePct + interviewPct) / 2 : interviewPct;

      await supabase.from("candidates").update({ final_score: Math.round(finalScore * 100) / 100 }).eq("id", candidate.id);
      await supabase.from("interview_sessions").update({ status: "completed" }).eq("id", sessionId!);

      if (candidate.application_id) {
        await supabase.from("applications").update({ status: "interviewed" }).eq("id", candidate.application_id);
      }
    },
    onSuccess: () => { toast.success("Interview completed!"); navigate("/results"); },
    onError: () => toast.error("Failed to save results"),
  });

  if (!session || !candidate || !questions) {
    return <Layout><div className="text-center py-12 text-muted-foreground">Loading...</div></Layout>;
  }

  if (questions.length === 0) {
    return (
      <Layout>
        <div className="max-w-lg mx-auto text-center py-12 space-y-4">
          <p className="text-muted-foreground">No questions found for this department.</p>
          <Button onClick={() => navigate("/admin")}>Add Questions</Button>
        </div>
      </Layout>
    );
  }

  const allParticipantsDone = participants?.every((p) => p.status === "done") ?? false;
  const doneCount = participants?.filter((p) => p.status === "done").length ?? 0;
  const totalParticipants = participants?.length ?? 0;

  if (phase === "completed") {
    return (
      <Layout>
        <div className="max-w-lg mx-auto text-center py-12 space-y-4">
          <CheckCircle className="h-16 w-16 text-success mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">Interview Completed</h1>
          <p className="text-muted-foreground">The Super HR has finished this interview.</p>
          <Button onClick={() => navigate("/results")}>View Results</Button>
        </div>
      </Layout>
    );
  }

  if (phase === "waiting") {
    return (
      <Layout>
        <div className="max-w-lg mx-auto text-center py-12 space-y-6">
          {isSuperHR ? (
            <>
              <CheckCircle className="h-16 w-16 text-primary mx-auto" />
              <h1 className="text-2xl font-bold text-foreground">Your Scores Submitted</h1>
              <p className="text-muted-foreground">
                {allParticipantsDone
                  ? "All interviewers have submitted. You can now finish the interview."
                  : `Waiting for other interviewers to submit... (${doneCount}/${totalParticipants} done)`}
              </p>
              <ParticipantStatus participants={participants ?? []} superHRId={session.started_by} />
              <NotesReview participants={participants ?? []} />
              <Button
                onClick={() => finishMutation.mutate()}
                disabled={finishMutation.isPending || !allParticipantsDone}
                className="bg-success hover:bg-success/90 text-success-foreground"
                size="lg"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                {finishMutation.isPending ? "Saving..." : `Finish Interview (${doneCount}/${totalParticipants} done)`}
              </Button>
            </>
          ) : (
            <>
              <Clock className="h-16 w-16 text-primary mx-auto animate-pulse" />
              <h1 className="text-2xl font-bold text-foreground">Scores Submitted</h1>
              <p className="text-muted-foreground">Waiting for Super HR to finish the interview...</p>
              <ParticipantStatus participants={participants ?? []} superHRId={session.started_by} />
              <NotesReview participants={participants ?? []} />
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-primary text-left">Your Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4}
                    placeholder="You can still edit your notes (auto-saved)..." />
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </Layout>
    );
  }

  // Questions phase
  const maxMarks = (currentQuestion as any)?.max_marks ?? 10;
  const currentScore = getQScore(currentQuestion!.id);
  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">{candidate.name}</h1>
            <p className="text-sm text-muted-foreground">{candidate.departments?.name} · Age {candidate.age}</p>
          </div>
          <div className="flex items-center gap-3">
            <ParticipantAvatars participants={participants ?? []} />
            <div className="text-sm font-medium text-muted-foreground">Question {currentQ + 1} of {totalQuestions}</div>
          </div>
        </div>

        <Progress value={progress} className="h-2" />

        <Card className="border-2 border-primary/20">
          <CardContent className="p-6">
            <p className="text-lg md:text-xl font-medium text-foreground leading-relaxed">{currentQuestion!.question_text}</p>
            <p className="text-sm text-muted-foreground mt-2">Max marks: {maxMarks}</p>
          </CardContent>
        </Card>

        <Card className="animate-scale-in">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-primary">Your Score</CardTitle>
          </CardHeader>
          <CardContent>
            <ScoreSlider label="Question Score" value={currentScore} onChange={(v) => updateQScore(currentQuestion!.id, v)} max={maxMarks} />
            <p className="text-xs text-muted-foreground mt-2">Other interviewers' scores are hidden until the interview ends.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-primary">Your Notes about the Candidate</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Write brief observations about the candidate (auto-saved)..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground mt-2">Notes auto-save and are visible after the interview.</p>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <Button variant="outline" disabled={currentQ === 0} onClick={() => setCurrentQ((p) => p - 1)}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
          </Button>
          {currentQ < totalQuestions - 1 ? (
            <Button onClick={() => { saveQMutation.mutate(currentQuestion!.id); setCurrentQ((p) => p + 1); }}>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={() => markDoneMutation.mutate()}
              disabled={markDoneMutation.isPending || myParticipant?.status === "done"}
              className="bg-success hover:bg-success/90 text-success-foreground"
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              {myParticipant?.status === "done" ? "Scores Submitted" : markDoneMutation.isPending ? "Submitting..." : "Submit Scores"}
            </Button>
          )}
        </div>
      </div>
    </Layout>
  );
}

function ParticipantAvatars({ participants }: { participants: any[] }) {
  return (
    <div className="flex -space-x-2">
      {participants.map((p) => (
        <div key={p.user_id}
          className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold border-2 border-background"
          title={p.user_name}>
          {p.user_name.charAt(0).toUpperCase()}
        </div>
      ))}
    </div>
  );
}

function ParticipantStatus({ participants, superHRId }: { participants: any[]; superHRId: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Users className="h-4 w-4" /> Interviewer Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {participants.map((p) => (
            <div key={p.user_id} className="flex items-center justify-between text-sm">
              <span className="text-foreground">
                {p.user_name}
                {p.user_id === superHRId && <Badge variant="outline" className="ml-2 text-xs">Super HR</Badge>}
              </span>
              <Badge variant={p.status === "done" ? "default" : "secondary"}>
                {p.status === "done" ? "✓ Done" : "Scoring"}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function NotesReview({ participants }: { participants: any[] }) {
  const withNotes = participants.filter((p) => (p.notes ?? "").trim().length > 0);
  if (withNotes.length === 0) return null;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-left">Interviewer Notes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-left">
        {withNotes.map((p) => (
          <div key={p.user_id} className="border-l-2 border-primary/40 pl-3">
            <p className="text-xs font-semibold text-foreground">{p.user_name}</p>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{p.notes}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
