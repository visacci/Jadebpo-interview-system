import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Download, FileText, ClipboardCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function ApplicationDetail() {
  const { jobId, applicationId } = useParams();
  const queryClient = useQueryClient();
  const [manualScore, setManualScore] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const saveManualScore = async () => {
    const num = Number(manualScore);
    if (Number.isNaN(num) || num < 0 || num > 100) {
      toast.error("Enter a score between 0 and 100");
      return;
    }
    setSaving(true);
    try {
      // 1. Update aptitude score, mark as completed & eligible
      const { error } = await supabase
        .from("applications")
        .update({
          aptitude_score: num,
          aptitude_status: "completed",
          status: "invited",
        })
        .eq("id", applicationId!);
      if (error) throw error;

      // 2. Remove any existing candidate record linked to this application
      //    so they re-appear in the Eligible Applicants list for a fresh interview
      await supabase
        .from("candidates")
        .delete()
        .eq("application_id", applicationId!);

      toast.success("Aptitude score overridden. Applicant is now eligible for interview.");
      setManualScore("");
      queryClient.invalidateQueries({ queryKey: ["application", applicationId] });
    } catch (e) {
      toast.error("Failed to save score");
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const { data: app } = useQuery({
    queryKey: ["application", applicationId],
    queryFn: async () => {
      const { data } = await supabase
        .from("applications")
        .select("*, jobs(title, departments(name))")
        .eq("id", applicationId!)
        .single();
      return data;
    },
  });

  const { data: documents } = useQuery({
    queryKey: ["app-documents", applicationId],
    queryFn: async () => {
      const { data } = await supabase
        .from("application_documents")
        .select("*")
        .eq("application_id", applicationId!);
      return data ?? [];
    },
    enabled: !!applicationId,
  });

  const { data: aptitudeAnswers } = useQuery({
    queryKey: ["aptitude-answers", applicationId],
    queryFn: async () => {
      const { data } = await supabase
        .from("aptitude_answers")
        .select(
          "*, aptitude_questions(question_text, correct_answer, options, order_index)",
        )
        .eq("application_id", applicationId!);
      return data ?? [];
    },
    enabled: !!applicationId,
  });

  const downloadDoc = async (filePath: string, fileName: string) => {
    const { data, error } = await supabase.storage
      .from("applicant-documents")
      .download(filePath);
    if (error || !data) return;
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!app) {
    return (
      <Layout>
        <div className="text-center py-12 text-muted-foreground">
          Loading...
        </div>
      </Layout>
    );
  }

  const docTypeLabels: Record<string, string> = {
    cv: "CV / Resume",
    application_letter: "Application Letter",
    uace_results: "UACE Results",
    uce_results: "UCE Results",
    university_documents: "University Documents",
    national_id: "National ID",
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link to={`/jobs/${jobId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-foreground">
            {app.applicant_name}
          </h1>
          <Badge variant="outline">{app.status}</Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Personal Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Name:</span>{" "}
              <span className="font-medium">{app.applicant_name}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Email:</span>{" "}
              <span className="font-medium">{app.email}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Phone:</span>{" "}
              <span className="font-medium">{app.phone}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Age:</span>{" "}
              <span className="font-medium">{app.age}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Salary Expectation:</span>{" "}
              <span className="font-medium">
                {app.salary_expectation ?? "N/A"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Applied:</span>{" "}
              <span className="font-medium">
                {new Date(app.created_at).toLocaleDateString()}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Aptitude Score:</span>{" "}
              <span className="font-medium">
                {app.aptitude_score ?? "N/A"}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className={app.aptitude_status === "completed" ? "border-primary/30" : "border-warning/50"}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className={`h-5 w-5 ${app.aptitude_status === "completed" ? "text-primary" : "text-warning"}`} />
              {app.aptitude_status === "completed" ? "Override Aptitude Score" : "Manual Aptitude Score"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {app.aptitude_status === "completed"
                ? `This applicant scored ${app.aptitude_score ?? "N/A"}% on their online test. You can override this with a manual score below.`
                : "This applicant has not taken the aptitude test online. Enter their score manually to make them eligible for the interview."}
            </p>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Label htmlFor="manual-score">
                  {app.aptitude_status === "completed" ? "Override Score (%)" : "Aptitude Score (%)"}
                </Label>
                <Input
                  id="manual-score"
                  type="number"
                  min={0}
                  max={100}
                  placeholder={app.aptitude_score != null ? String(app.aptitude_score) : "0 - 100"}
                  value={manualScore}
                  onChange={(e) => setManualScore(e.target.value)}
                />
              </div>
              <Button onClick={saveManualScore} disabled={saving || !manualScore}>
                {saving ? "Saving..." : app.aptitude_status === "completed" ? "Override Score" : "Save Score"}
              </Button>
            </div>
          </CardContent>
        </Card>


        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" /> Documents
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {documents?.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No documents uploaded
              </p>
            )}
            {documents?.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between bg-secondary/50 rounded-lg px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {docTypeLabels[doc.document_type] ?? doc.document_type}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {doc.file_name}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => downloadDoc(doc.file_path, doc.file_name)}
                >
                  <Download className="h-4 w-4 mr-1" /> Download
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {aptitudeAnswers && aptitudeAnswers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Aptitude Test Answers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {aptitudeAnswers
                .sort(
                  (a, b) =>
                    ((a as any).aptitude_questions?.order_index ?? 0) -
                    ((b as any).aptitude_questions?.order_index ?? 0),
                )
                .map((ans, idx) => (
                  <div key={ans.id} className="bg-secondary/50 rounded-lg p-3">
                    <p className="text-sm font-medium text-foreground mb-1">
                      {idx + 1}.{" "}
                      {(ans as any).aptitude_questions?.question_text}
                    </p>
                    <div className="flex items-center gap-4 text-xs">
                      <span>
                        Answer:{" "}
                        <span
                          className={`font-medium ${ans.is_correct ? "text-success" : "text-destructive"}`}
                        >
                          {ans.selected_answer}
                        </span>
                      </span>
                      {!ans.is_correct && (
                        <span className="text-muted-foreground">
                          Correct:{" "}
                          {(ans as any).aptitude_questions?.correct_answer}
                        </span>
                      )}
                      {ans.is_correct ? (
                        <Badge
                          className="bg-success/10 text-success"
                          variant="outline"
                        >
                          ✓ Correct
                        </Badge>
                      ) : (
                        <Badge
                          className="bg-destructive/10 text-destructive"
                          variant="outline"
                        >
                          ✗ Wrong
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
