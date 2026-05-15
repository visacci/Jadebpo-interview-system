import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle, Clock, AlertTriangle, PlayCircle, Loader2, FileText } from "lucide-react";

const TEST_DURATION_MINUTES = 20;
const TEST_DURATION_MS = TEST_DURATION_MINUTES * 60 * 1000;

export default function AptitudeTest() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(TEST_DURATION_MS);
  const [submitted, setSubmitted] = useState(false);
  const [expired, setExpired] = useState(false);
  const [localStarted, setLocalStarted] = useState(false);

  const { data: application, isLoading: appLoading, isError: appError } = useQuery({
    queryKey: ["aptitude-app", applicationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("*, jobs(title, departments(name))")
        .eq("id", applicationId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!applicationId,
    retry: 1,
  });

  // Load GLOBAL aptitude questions (job_id IS NULL)
  const { data: questions, isLoading: questionsLoading, isError: questionsError } = useQuery({
    queryKey: ["global-aptitude-questions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("aptitude_questions")
        .select("*")
        .is("job_id", null)
        .order("order_index");
      return data ?? [];
    },
    retry: 1,
  });

  // Start time management
  const startTime = useMemo(() => {
    if (!application?.aptitude_started_at) return null;
    return new Date(application.aptitude_started_at).getTime();
  }, [application?.aptitude_started_at]);
  useEffect(() => {
    if (application?.aptitude_status === "pending") {
      setAnswers({});
    }
  }, [application?.aptitude_status]);

  useEffect(() => {
    if (startTime) {
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, TEST_DURATION_MS - elapsed);
        setTimeLeft(remaining);
        if (remaining === 0 && !submitted) {
          setExpired(true);
          clearInterval(interval);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [startTime, submitted]);

  const startTestMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("applications")
        .update({ 
          aptitude_started_at: new Date().toISOString(),
          aptitude_status: 'in_progress'
        })
        .eq("id", applicationId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aptitude-app", applicationId] });
      setLocalStarted(true);
      toast.success("Test started! Good luck.");
    },
    onError: (e) => toast.error("Failed to start test: " + e.message),
  });

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!questions || !application) throw new Error("Missing data");

      let earnedMarks = 0;
      let totalMarks = 0;
      const answerRows = questions.map((q) => {
        const maxMarks = (q as any).max_marks ?? 5;
        totalMarks += maxMarks;
        const selected = answers[q.id] || "";
        const isCorrect = selected === q.correct_answer;
        if (isCorrect) earnedMarks += maxMarks;
        return {
          application_id: applicationId!,
          question_id: q.id,
          selected_answer: selected,
          is_correct: isCorrect,
        };
      });

      const aptitudeScore =
        totalMarks > 0 ? Math.round((earnedMarks / totalMarks) * 100) : 0;

      const { error: ansErr } = await supabase
        .from("aptitude_answers")
        .insert(answerRows);
      if (ansErr) throw ansErr;

      const { error: updErr } = await supabase
        .from("applications")
        .update({ aptitude_score: aptitudeScore, aptitude_status: "completed" })
        .eq("id", applicationId!);
      if (updErr) throw updErr;
    },
    onSuccess: () => setSubmitted(true),
    onError: (e) => toast.error("Submission failed: " + e.message),
  });

  const handleSubmit = useCallback(() => {
    if (!submitMutation.isPending && !submitted) {
      submitMutation.mutate();
    }
  }, [submitMutation, submitted]);

  useEffect(() => {
    if (expired && !submitted && (!!startTime || localStarted)) {
      handleSubmit();
    }
  }, [expired, submitted, handleSubmit, startTime, localStarted]);

  if (appLoading || questionsLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="text-muted-foreground font-medium">Loading test...</p>
      </div>
    );
  }

  if (appError || questionsError || !application) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-destructive/20 shadow-lg">
          <CardContent className="p-8 text-center space-y-4">
            <AlertTriangle className="h-16 w-16 text-destructive mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">
              Error Loading Test
            </h1>
            <p className="text-muted-foreground">
              We couldn't load the aptitude test. This might be due to an invalid link or a temporary connection issue.
            </p>
            <Button onClick={() => window.location.reload()} variant="outline" className="w-full">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (application.aptitude_status === "completed") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-lg">
          <CardContent className="p-8 text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-success mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">
              Test Already Submitted
            </h1>
            <p className="text-muted-foreground">
              You have already completed this aptitude test. Thank you!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-lg">
          <CardContent className="p-8 text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-success mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">
              Test Submitted!
            </h1>
            <p className="text-muted-foreground">
              Your aptitude test has been submitted successfully. You will be
              contacted regarding next steps.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if ((!application.aptitude_started_at || application.aptitude_status === "pending") && !localStarted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full shadow-xl border-primary/10">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
                <FileText className="h-6 w-6 text-primary-foreground" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Aptitude Test Introduction</CardTitle>
            <p className="text-muted-foreground">Please read the following carefully before starting</p>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="bg-secondary/50 rounded-xl p-6 space-y-4">
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                Important Instructions
              </h2>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-3">
                  <Clock className="h-5 w-5 mt-0.5 shrink-0 text-primary" />
                  <span>You have <strong>{TEST_DURATION_MINUTES} minutes</strong> to complete the test.</span>
                </li>
                <li className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0 text-destructive" />
                  <span>The timer <strong>cannot be paused</strong> once started. Closing your browser will not stop the timer.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 mt-0.5 shrink-0 text-success" />
                  <span>Ensure you have a <strong>stable internet connection</strong> and 20 minutes of uninterrupted time.</span>
                </li>
                <li className="flex items-start gap-3">
                  <FileText className="h-5 w-5 mt-0.5 shrink-0 text-primary" />
                  <span>The test contains <strong>{questions?.length ?? 0} questions</strong>. All questions are multiple choice.</span>
                </li>
              </ul>
            </div>

            <div className="space-y-4 pt-4">
              <p className="text-center text-xs text-muted-foreground italic">
                By clicking "Start Aptitude Test", you acknowledge that you are ready to begin. The timer will start immediately.
              </p>
              <Button 
                className="w-full h-14 text-lg font-bold shadow-lg" 
                size="lg" 
                onClick={() => startTestMutation.mutate()}
                disabled={startTestMutation.isPending}
              >
                {startTestMutation.isPending ? (
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                ) : (
                  <PlayCircle className="h-6 w-6 mr-2" />
                )}
                Start Aptitude Test
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-lg">
          <CardContent className="p-8 text-center space-y-4">
            <p className="text-muted-foreground">
              No aptitude questions configured yet.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const timerColor =
    timeLeft < 60000
      ? "text-destructive"
      : timeLeft < 180000
        ? "text-warning"
        : "text-foreground";

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Sticky timer */}
      <div className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b shadow-sm">
        <div className="container max-w-2xl flex items-center justify-between py-3">
          <div>
            <h1 className="text-lg font-bold text-foreground">
              Jade BPO Aptitude Test
            </h1>
            <p className="text-xs text-muted-foreground">
              {questions.length} questions · {TEST_DURATION_MINUTES} minutes
            </p>
          </div>
          <div
            className={`flex items-center gap-2 text-xl font-mono font-bold ${timerColor}`}
          >
            {timeLeft < 60000 && (
              <AlertTriangle className="h-5 w-5 animate-pulse text-destructive" />
            )}
            <Clock className="h-5 w-5" />
            {formatTime(timeLeft)}
          </div>
        </div>
      </div>

      <div className="container max-w-2xl py-6 space-y-6">
        {questions.map((q, idx) => {
          const imageUrls = (q as any).image_url
            ? (q as any).image_url.split(",")
            : [];
          const category = (q as any).category;
          return (
            <Card key={q.id} className="animate-fade-in hover:shadow-md transition-shadow border-primary/5">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 flex-1">
                    {category && (
                      <Badge variant="secondary" className="text-[10px] uppercase tracking-wider mb-1">
                        {category}
                      </Badge>
                    )}
                    <p className="font-semibold text-foreground whitespace-pre-line leading-relaxed">
                      {idx + 1}. {q.question_text}
                      <span className="text-[10px] text-muted-foreground ml-2 font-normal">
                        ({(q as any).max_marks ?? 5} marks)
                      </span>
                    </p>
                  </div>
                </div>

                {imageUrls.length > 0 && (
                  <div className="space-y-2 py-2">
                    {imageUrls.map((url: string, imgIdx: number) => (
                      <img
                        key={imgIdx}
                        src={url.trim()}
                        alt={`Question ${idx + 1} diagram ${imgIdx + 1}`}
                        className="rounded-lg border shadow-sm max-w-full max-h-64 object-contain bg-white mx-auto"
                      />
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {(q.options as string[]).map((opt, oi) => {
                    const isSelected = answers[q.id] === opt;
                    return (
                      <button
                        key={`${q.id}-${oi}`}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setAnswers((prev) => ({ ...prev, [q.id]: opt }));
                        }}
                        className={`text-left text-sm px-4 py-3 rounded-xl border-2 transition-all duration-200 ${
                          isSelected
                            ? "border-primary bg-primary/5 text-primary font-bold shadow-sm"
                            : "border-secondary bg-secondary/30 hover:border-primary/30 hover:bg-secondary/50"
                        }`}
                      >
                        <span className="inline-block w-6 h-6 rounded-full bg-background border flex-shrink-0 text-center leading-5 text-xs mr-2 font-bold">
                          {String.fromCharCode(65 + oi)}
                        </span>
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}

        <div className="pt-8">
          <Button
            className="w-full h-14 text-lg font-bold shadow-xl rounded-xl"
            size="lg"
            onClick={handleSubmit}
            disabled={submitMutation.isPending}
          >
            {submitMutation.isPending ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Submitting Test...
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5 mr-2" />
                Submit Test ({Object.keys(answers).length}/{questions.length} answered)
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
