import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getScoreColor, getScoreBgColor } from "@/lib/scoring";
import { Search, Download, Trophy, TrendingDown, ChevronDown, ChevronUp, FileSpreadsheet, Trash2, FileText, MessageSquare, RotateCcw, Pencil, Check, X, MailCheck, MailX } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function Results() {
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const queryClient = useQueryClient();

  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data } = await supabase.from("departments").select("*").order("name");
      return data ?? [];
    },
  });

  const { data: candidates } = useQuery({
    queryKey: ["candidates-results"],
    queryFn: async () => {
      const { data } = await supabase
        .from("candidates")
        .select("*, departments(name)")
        .order("final_score", { ascending: false, nullsFirst: false });
      return data ?? [];
    },
  });

  const filtered = candidates?.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchDept = deptFilter === "all" || c.department_id === deptFilter;
    
    const candidateDate = new Date(c.created_at);
    let matchDate = true;
    
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      if (candidateDate < start) matchDate = false;
    }
    
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      if (candidateDate > end) matchDate = false;
    }

    return matchSearch && matchDept && matchDate;
  }) ?? [];

  const deptAverages = departments?.map((d) => {
    const deptCandidates = filtered.filter((c) => c.department_id === d.id && c.final_score != null);
    const avg = deptCandidates.length > 0
      ? deptCandidates.reduce((s, c) => s + (c.final_score ?? 0), 0) / deptCandidates.length
      : 0;
    return { name: d.name, avg: Math.round(avg * 100) / 100, count: deptCandidates.length };
  }) ?? [];

  const exportCSV = () => {
    const headers = ["Rank,Name,Age,Department,Final Score (%)"];
    const rows = filtered.map((c, i) =>
      `${i + 1},${c.name},${c.age},${(c as any).departments?.name ?? ""},${c.final_score ?? "N/A"}`
    );
    const csv = [...headers, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "interview_results.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportExcel = async () => {
    setExporting(true);
    try {
      // Fetch detailed scores for all filtered candidates
      const candidateIds = filtered.map((c) => c.id);
      if (candidateIds.length === 0) {
        toast.error("No candidates to export");
        return;
      }

      const [scoresRes, namesRes, appsRes] = await Promise.all([
        supabase.from("scores").select("*, questions(question_text, order_index, max_marks)").in("candidate_id", candidateIds),
        supabase.from("interviewer_names").select("*").in("candidate_id", candidateIds),
        supabase.from("candidates").select("application_id").in("id", candidateIds),
      ]);

      const appIds = (appsRes.data ?? []).map((c) => c.application_id).filter(Boolean) as string[];
      const { data: apps } = appIds.length > 0
        ? await supabase.from("applications").select("id, aptitude_score, salary_expectation").in("id", appIds)
        : { data: [] };

      const appMap = new Map((apps ?? []).map((a) => [a.id, a]));
      const namesMap = new Map((namesRes.data ?? []).map((n) => [n.candidate_id, n]));
      const scoresMap = new Map<string, any[]>();
      (scoresRes.data ?? []).forEach((s) => {
        if (!scoresMap.has(s.candidate_id)) scoresMap.set(s.candidate_id, []);
        scoresMap.get(s.candidate_id)!.push(s);
      });

      // Build CSV with detailed columns
      const headers = [
        "Rank", "Name", "Age", "Department", "Salary Expectation",
        "Aptitude Score (%)", "Question", "Max Marks",
        "Interviewer 1", "Interviewer 1 Score",
        "Interviewer 2", "Interviewer 2 Score",
        "Interviewer 3", "Interviewer 3 Score",
        "Question Average", "Interview Score (%)", "Final Score (%)"
      ];

      const rows: string[][] = [];
      filtered.forEach((c, idx) => {
        const candScores = scoresMap.get(c.id) ?? [];
        const names = namesMap.get(c.id);
        const candApp = c.application_id ? appMap.get(c.application_id) : null;
        const int1Name = names?.interviewer_1_name ?? "Int. 1";
        const int2Name = names?.interviewer_2_name ?? "Int. 2";
        const int3Name = names?.interviewer_3_name ?? "Int. 3";

        // Calculate interview %
        let totalEarned = 0, totalMax = 0;
        candScores.forEach((s) => {
          totalEarned += s.final_question_score ?? 0;
          totalMax += s.questions?.max_marks ?? 10;
        });
        const interviewPct = totalMax > 0 ? ((totalEarned / totalMax) * 100).toFixed(1) : "0";

        if (candScores.length === 0) {
          rows.push([
            String(idx + 1), c.name, String(c.age),
            (c as any).departments?.name ?? "",
            (candApp as any)?.salary_expectation ?? "",
            candApp?.aptitude_score != null ? String(candApp.aptitude_score) : "N/A",
            "", "", int1Name, "", int2Name, "", int3Name, "",
            "", interviewPct, String(c.final_score ?? "N/A"),
          ]);
        } else {
          candScores.sort((a, b) => (a.questions?.order_index ?? 0) - (b.questions?.order_index ?? 0));
          candScores.forEach((s, si) => {
            rows.push([
              si === 0 ? String(idx + 1) : "",
              si === 0 ? c.name : "",
              si === 0 ? String(c.age) : "",
              si === 0 ? ((c as any).departments?.name ?? "") : "",
              si === 0 ? ((candApp as any)?.salary_expectation ?? "") : "",
              si === 0 ? (candApp?.aptitude_score != null ? String(candApp.aptitude_score) : "N/A") : "",
              `Q${s.questions?.order_index ?? si + 1}: ${s.questions?.question_text ?? ""}`,
              String(s.questions?.max_marks ?? 10),
              int1Name, String(s.interviewer_1_score ?? 0),
              int2Name, String(s.interviewer_2_score ?? 0),
              int3Name, String(s.interviewer_3_score ?? 0),
              String((s.final_question_score ?? 0).toFixed(1)),
              si === 0 ? interviewPct : "",
              si === 0 ? String(c.final_score ?? "N/A") : "",
            ]);
          });
        }
      });

      const csvContent = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const deptName = deptFilter !== "all" ? departments?.find((d) => d.id === deptFilter)?.name ?? "department" : "all_departments";
      a.download = `interview_report_${deptName.replace(/\s+/g, "_").toLowerCase()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Report exported successfully!");
    } catch (e) {
      toast.error("Export failed");
      console.error(e);
    } finally {
      setExporting(false);
    }
  };

  const handleClearSystem = async () => {
    setIsClearing(true);
    try {
      const { error: candError } = await supabase.from('candidates').delete().not('id', 'is', null);
      if (candError) throw candError;
      
      const { error: appError } = await supabase.from('applications').delete().not('id', 'is', null);
      if (appError) throw appError;

      toast.success("System has been cleared successfully");
      queryClient.invalidateQueries({ queryKey: ["candidates-results"] });
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    } catch (e) {
      toast.error("Failed to clear system");
      console.error(e);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-foreground">Results & Rankings</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-2" /> CSV
            </Button>
            <Button variant="outline" onClick={exportExcel} disabled={exporting}>
              <FileSpreadsheet className="h-4 w-4 mr-2" /> {exporting ? "Exporting..." : "Detailed Report"}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isClearing}>
                  <Trash2 className="h-4 w-4 mr-2" /> {isClearing ? "Clearing..." : "Clear System"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete all candidates, applications, and their interview scores from the database, resetting the system to a fresh state.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearSystem} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Yes, clear everything
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {deptAverages.map((d) => (
            <Card key={d.name}>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">{d.name}</p>
                <p className={`text-xl font-bold ${getScoreColor(d.avg)}`}>{d.avg ? `${d.avg}%` : "—"}</p>
                <p className="text-xs text-muted-foreground">{d.count} candidates</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search candidates..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-48"><SelectValue placeholder="All Departments" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments?.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              className="w-40"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="From Date"
            />
            <span className="text-muted-foreground">to</span>
            <Input
              type="date"
              className="w-40"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="To Date"
            />
            {(startDate || endDate) && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => { setStartDate(""); setEndDate(""); }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear Dates
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {filtered.length === 0 && (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No candidates found</CardContent></Card>
          )}
          {filtered.map((c, idx) => (
            <CandidateRow key={c.id} candidate={c} rank={idx + 1} isTop={idx === 0 && filtered.length > 1}
              isBottom={idx === filtered.length - 1 && filtered.length > 1}
              expanded={expandedId === c.id}
              onToggle={() => setExpandedId(expandedId === c.id ? null : c.id)} />
          ))}
        </div>
      </div>
    </Layout>
  );
}

function CandidateRow({ candidate, rank, isTop, isBottom, expanded, onToggle }: {
  candidate: any; rank: number; isTop: boolean; isBottom: boolean; expanded: boolean; onToggle: () => void;
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: details } = useQuery({
    queryKey: ["candidate-detail-v5", candidate.id],
    queryFn: async () => {
      const [scoresRes, namesRes, appRes, sessionsRes] = await Promise.all([
        supabase.from("scores").select("*, questions(question_text, order_index, max_marks)").eq("candidate_id", candidate.id).order("created_at"),
        supabase.from("interviewer_names").select("*").eq("candidate_id", candidate.id).single(),
        candidate.application_id
          ? supabase.from("applications").select("aptitude_score").eq("id", candidate.application_id).single()
          : Promise.resolve({ data: null }),
        supabase.from("interview_sessions").select("id").eq("candidate_id", candidate.id),
      ]);
      const sessionIds = (sessionsRes.data ?? []).map((s) => s.id);
      let notes: any[] = [];
      if (sessionIds.length > 0) {
        const { data } = await supabase.from("interview_participants")
          .select("user_name, notes").in("session_id", sessionIds);
        notes = (data ?? []).filter((n) => (n.notes ?? "").trim().length > 0);
      }
      return {
        scores: scoresRes.data ?? [],
        names: namesRes.data,
        aptitudeScore: appRes.data?.aptitude_score ?? null,
        notes,
      };
    },
    enabled: expanded,
  });

  const score = candidate.final_score ?? 0;
  const printRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingAptitude, setEditingAptitude] = useState(false);
  const [aptitudeInput, setAptitudeInput] = useState("");
  const [isSavingAptitude, setIsSavingAptitude] = useState(false);
  const [sendingEmailType, setSendingEmailType] = useState<"success" | "rejection" | null>(null);
  const queryClient = useQueryClient();

  const sendOutcomeEmail = async (type: "success" | "rejection") => {
    if (!candidate.application_id) {
      toast.error("No linked application found for this candidate.");
      return;
    }

    setSendingEmailType(type);
    try {
      const { data: appData, error: appError } = await supabase
        .from("applications")
        .select("email, applicant_name, jobs(title)")
        .eq("id", candidate.application_id)
        .single();

      if (appError) throw appError;
      if (!appData?.email) {
        toast.error("Candidate email not found.");
        return;
      }

      const { error: emailError } = await supabase.functions.invoke("send-interview-email", {
        body: {
          type,
          to: appData.email,
          applicantName: appData.applicant_name || candidate.name,
          jobTitle: (appData as any).jobs?.title || "the position",
        },
      });
      if (emailError) throw emailError;

      toast.success(
        type === "success"
          ? `Success email sent to ${appData.email}`
          : `Rejection email sent to ${appData.email}`
      );
    } catch (e) {
      console.error(e);
      toast.error(`Failed to send ${type === "success" ? "success" : "rejection"} email`);
    } finally {
      setSendingEmailType(null);
    }
  };

  const saveAptitudeScore = async () => {
    const newScore = parseFloat(aptitudeInput);
    if (isNaN(newScore) || newScore < 0 || newScore > 100) {
      toast.error("Score must be between 0 and 100");
      return;
    }
    setIsSavingAptitude(true);
    try {
      // Update aptitude_score in the applications table
      if (candidate.application_id) {
        const { error } = await supabase.from("applications")
          .update({ aptitude_score: newScore })
          .eq("id", candidate.application_id);
        if (error) throw error;
      }
      // Recalculate final_score: (aptitude + interview) / 2
      const interviewEarned = (details?.scores ?? []).reduce((acc: number, s: any) => acc + (s.final_question_score || 0), 0);
      const interviewMax = (details?.scores ?? []).reduce((acc: number, s: any) => acc + (s.questions?.max_marks || 10), 0);
      const interviewPct = interviewMax > 0 ? (interviewEarned / interviewMax) * 100 : 0;
      const newFinalScore = Math.round(((newScore + interviewPct) / 2) * 100) / 100;
      await supabase.from("candidates").update({ final_score: newFinalScore }).eq("id", candidate.id);

      toast.success("Aptitude score updated!");
      setEditingAptitude(false);
      queryClient.invalidateQueries({ queryKey: ["candidate-detail-v5", candidate.id] });
      queryClient.invalidateQueries({ queryKey: ["candidates-results"] });
    } catch (e) {
      toast.error("Failed to update aptitude score");
      console.error(e);
    } finally {
      setIsSavingAptitude(false);
    }
  };

  const deleteCandidate = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase.from("candidates").delete().eq("id", candidate.id);
      if (error) throw error;
      toast.success(`${candidate.name}'s result deleted.`);
      queryClient.invalidateQueries({ queryKey: ["candidates-results"] });
    } catch (e) {
      toast.error("Failed to delete result");
      console.error(e);
    } finally {
      setIsDeleting(false);
    }
  };

  const [isRedoing, setIsRedoing] = useState(false);

  const redoInterview = async () => {
    setIsRedoing(true);
    try {
      // 1. Delete old scores
      await supabase.from("scores").delete().eq("candidate_id", candidate.id);
      // 2. Delete old interviewer names
      await supabase.from("interviewer_names").delete().eq("candidate_id", candidate.id);
      // 3. Delete old sessions (cascades participants + question scores)
      await supabase.from("interview_sessions").delete().eq("candidate_id", candidate.id);
      // 4. Reset final score on candidate
      await supabase.from("candidates").update({ final_score: null }).eq("id", candidate.id);

      // 5. Get current user's display name
      const { data: profile } = await supabase
        .from("profiles").select("full_name").eq("user_id", user!.id).single();
      const myName = profile?.full_name || user?.email || "HR User";

      // 6. Create fresh session
      const { data: session, error: sessErr } = await supabase
        .from("interview_sessions")
        .insert({ candidate_id: candidate.id, started_by: user!.id })
        .select().single();
      if (sessErr) throw sessErr;

      // 7. Add current user as first participant
      await supabase.from("interview_participants").insert({
        session_id: session.id, user_id: user!.id, user_name: myName,
      });

      toast.success(`Redo interview started for ${candidate.name}`);
      queryClient.invalidateQueries({ queryKey: ["candidates-results"] });
      navigate(`/interview/session/${session.id}`);
    } catch (e) {
      toast.error("Failed to redo interview");
      console.error(e);
    } finally {
      setIsRedoing(false);
    }
  };

  const generatePDF = async () => {
    if (!printRef.current) return;
    setIsGeneratingPdf(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
      });

      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();   // 210mm
      const pdfPageHeight = pdf.internal.pageSize.getHeight(); // 297mm

      // Convert the A4 page height (mm) → pixels on the canvas
      const pageHeightPx = Math.floor((canvas.width * pdfPageHeight) / pdfWidth);
      const totalPages = Math.ceil(canvas.height / pageHeightPx);

      for (let page = 0; page < totalPages; page++) {
        if (page > 0) pdf.addPage();

        // Slice this page's portion out of the full canvas
        const srcY = page * pageHeightPx;
        const srcH = Math.min(pageHeightPx, canvas.height - srcY);

        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = srcH;
        const ctx = pageCanvas.getContext("2d")!;
        ctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);

        const imgData = pageCanvas.toDataURL("image/png");
        const imgHeightMm = (srcH * pdfWidth) / canvas.width;
        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, imgHeightMm);
      }

      pdf.save(`${candidate.name.replace(/\s+/g, '_')}_Result_Card.pdf`);
      toast.success(`PDF generated (${totalPages} page${totalPages > 1 ? "s" : ""})`);
    } catch (e) {
      console.error(e);
      toast.error("Failed to generate PDF");
    } finally {
      setIsGeneratingPdf(false);
    }
  };


  return (
    <Card className={`transition-all ${isTop ? "border-success/50 shadow-md" : isBottom ? "border-destructive/30" : ""}`}>
      <CardContent className="p-0">
        <button onClick={onToggle} className="w-full flex items-center justify-between p-4 text-left hover:bg-secondary/50 transition-colors rounded-lg">
          <div className="flex items-center gap-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              rank <= 3 ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
            }`}>
              {rank}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">{candidate.name}</span>
                {isTop && <Badge className="bg-success text-success-foreground"><Trophy className="h-3 w-3 mr-1" />Top</Badge>}
                {isBottom && <Badge variant="destructive"><TrendingDown className="h-3 w-3 mr-1" />Lowest</Badge>}
              </div>
              <span className="text-sm text-muted-foreground">
                {candidate.departments?.name} · Age {candidate.age} · {new Date(candidate.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`text-right px-3 py-1 rounded-lg ${getScoreBgColor(score)}`}>
              <span className={`text-lg font-bold ${getScoreColor(score)}`}>{score.toFixed(1)}%</span>
            </div>
            {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </div>
        </button>

        {expanded && details && (
          <div className="border-t p-4 space-y-4 animate-fade-in relative">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-semibold text-sm text-foreground">Interview Breakdown</h4>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={generatePDF} disabled={isGeneratingPdf}>
                  <FileText className="h-4 w-4 mr-2" />
                  {isGeneratingPdf ? "Generating..." : "Download PDF Card"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => sendOutcomeEmail("success")}
                  disabled={sendingEmailType !== null}
                  className="border-green-500 text-green-700 hover:bg-green-50 dark:border-green-600 dark:text-green-400 dark:hover:bg-green-950/40"
                >
                  <MailCheck className="h-4 w-4 mr-2" />
                  {sendingEmailType === "success" ? "Sending..." : "Send Success Email"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => sendOutcomeEmail("rejection")}
                  disabled={sendingEmailType !== null}
                  className="border-red-500 text-red-700 hover:bg-red-50 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-950/40"
                >
                  <MailX className="h-4 w-4 mr-2" />
                  {sendingEmailType === "rejection" ? "Sending..." : "Send Rejection Email"}
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="outline" disabled={isRedoing}
                      className="border-orange-400 text-orange-600 hover:bg-orange-50 dark:border-orange-600 dark:text-orange-400 dark:hover:bg-orange-950/40">
                      <RotateCcw className="h-4 w-4 mr-2" />
                      {isRedoing ? "Starting..." : "Redo Interview"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Redo Interview for {candidate.name}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will <strong>permanently delete all existing scores, notes, and interview data</strong> for <strong>{candidate.name}</strong> and start a fresh interview session. You will be taken directly into the new session.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={redoInterview}
                        className="bg-orange-500 text-white hover:bg-orange-600"
                      >
                        Yes, redo interview
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="destructive" disabled={isDeleting}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      {isDeleting ? "Deleting..." : "Delete Result"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete {candidate.name}'s Result?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete all interview scores, notes, and data for <strong>{candidate.name}</strong>. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={deleteCandidate}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Yes, delete result
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
            
            {details.aptitudeScore != null ? (
              <div className="bg-secondary/50 rounded-lg p-3 flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-foreground">Aptitude Test Score:</p>
                {editingAptitude ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      value={aptitudeInput}
                      onChange={(e) => setAptitudeInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") saveAptitudeScore(); if (e.key === "Escape") setEditingAptitude(false); }}
                      className="w-20 text-sm px-2 py-1 rounded border border-border bg-background text-foreground text-center focus:outline-none focus:ring-2 focus:ring-primary"
                      autoFocus
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                    <button
                      onClick={saveAptitudeScore}
                      disabled={isSavingAptitude}
                      className="p-1 rounded text-green-600 hover:bg-green-100 dark:hover:bg-green-900/40 disabled:opacity-50"
                      title="Save"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setEditingAptitude(false)}
                      className="p-1 rounded text-muted-foreground hover:bg-secondary"
                      title="Cancel"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${getScoreColor(details.aptitudeScore)}`}>{details.aptitudeScore}%</span>
                    <button
                      onClick={() => { setAptitudeInput(String(details.aptitudeScore)); setEditingAptitude(true); }}
                      className="p-1 rounded text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                      title="Edit aptitude score"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ) : candidate.application_id ? (
              <div className="bg-secondary/50 rounded-lg p-3 flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-foreground">Aptitude Test Score: <span className="text-muted-foreground italic">Not recorded</span></p>
                {editingAptitude ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      value={aptitudeInput}
                      onChange={(e) => setAptitudeInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") saveAptitudeScore(); if (e.key === "Escape") setEditingAptitude(false); }}
                      className="w-20 text-sm px-2 py-1 rounded border border-border bg-background text-foreground text-center focus:outline-none focus:ring-2 focus:ring-primary"
                      autoFocus
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                    <button onClick={saveAptitudeScore} disabled={isSavingAptitude}
                      className="p-1 rounded text-green-600 hover:bg-green-100 dark:hover:bg-green-900/40 disabled:opacity-50" title="Save">
                      <Check className="h-4 w-4" />
                    </button>
                    <button onClick={() => setEditingAptitude(false)}
                      className="p-1 rounded text-muted-foreground hover:bg-secondary" title="Cancel">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setAptitudeInput(""); setEditingAptitude(true); }}
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <Pencil className="h-3 w-3" /> Set score
                  </button>
                )}
              </div>
            ) : null}

            <h4 className="font-semibold text-sm text-foreground mt-4">Interview Question Scores</h4>
            {details.scores.map((s: any) => (
              <div key={s.id} className="bg-secondary/50 rounded-lg p-3 space-y-1">
                <p className="font-medium text-sm text-foreground">
                  Q{s.questions?.order_index}: {s.questions?.question_text}
                  <span className="text-xs text-muted-foreground ml-2">(max: {s.questions?.max_marks ?? 10})</span>
                </p>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="text-center">
                      <p className="text-muted-foreground">{(details.names as any)?.[`interviewer_${i}_name`] ?? `Int. ${i}`}</p>
                      <p className={`font-bold ${getScoreColor(((s[`interviewer_${i}_score`] ?? 0) / (s.questions?.max_marks ?? 10)) * 100)}`}>
                        {s[`interviewer_${i}_score`] ?? 0}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-right text-muted-foreground">
                  Avg: <span className="font-bold">{(s.final_question_score ?? 0).toFixed(1)} / {s.questions?.max_marks ?? 10}</span>
                </p>
              </div>
            ))}

            {/* Interviewer Notes — always shown */}
            <div className="mt-2 rounded-xl border border-border bg-amber-50/50 dark:bg-amber-950/20 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-amber-200/60 dark:border-amber-800/40 bg-amber-100/60 dark:bg-amber-900/30">
                <MessageSquare className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <h4 className="font-semibold text-sm text-amber-900 dark:text-amber-200">Interviewer Notes</h4>
                {details.notes && details.notes.length > 0 && (
                  <span className="ml-auto text-xs font-medium bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 px-2 py-0.5 rounded-full">
                    {details.notes.length} {details.notes.length === 1 ? "note" : "notes"}
                  </span>
                )}
              </div>
              <div className="p-4">
                {details.notes && details.notes.length > 0 ? (
                  <div className="space-y-3">
                    {details.notes.map((n: any, i: number) => (
                      <div key={i} className="bg-white dark:bg-amber-950/40 rounded-lg p-3 border border-amber-200/70 dark:border-amber-800/50 shadow-sm">
                        <p className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-1 flex items-center gap-1">
                          <span className="inline-block w-5 h-5 rounded-full bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 text-center leading-5 font-black text-xs">
                            {n.user_name?.charAt(0)?.toUpperCase()}
                          </span>
                          {n.user_name}
                        </p>
                        <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{n.notes}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic text-center py-2">
                    No notes were recorded during this interview.
                  </p>
                )}
              </div>
            </div>

            <div className="bg-primary/5 rounded-lg p-3 text-sm mt-4">
              <p className="font-semibold text-foreground">Final Score Breakdown</p>
              {details.aptitudeScore != null && (
                <p className="text-muted-foreground">Aptitude: {details.aptitudeScore}%</p>
              )}
              <p className="text-muted-foreground">Interview: computed from question marks</p>
              <p className="font-bold text-foreground">Final: {score.toFixed(1)}%{details.aptitudeScore != null ? " (avg of aptitude + interview)" : ""}</p>
            </div>

            {/* Hidden Result Card for PDF Generation */}
            <div style={{ position: "fixed", left: "-10000px", top: 0, zIndex: -1, pointerEvents: "none" }}>
              <div ref={printRef} className="w-[800px] bg-white text-black p-10 relative flex flex-col font-sans border-8 border-gray-100">
                {/* Header */}
                <div className="flex items-center justify-between border-b-2 border-primary pb-6 mb-8">
                  <div>
                    <img src="/images/logo.png" alt="Jade BPO" className="h-12 object-contain" />
                    <p className="text-gray-500 font-medium tracking-wide uppercase mt-2">Official Candidate Result Card</p>
                  </div>
                  <div className="text-right">
                    <h2 className="text-2xl font-bold text-gray-800">{candidate.name}</h2>
                    <p className="text-gray-600 font-medium">{candidate.departments?.name} · Age {candidate.age}</p>
                  </div>
                </div>
                
                {/* Score Overview */}
                <div className="flex gap-6 mb-10">
                  <div className="bg-blue-50 rounded-2xl p-6 flex-1 text-center border border-blue-100 shadow-sm">
                    <p className="text-sm font-bold text-blue-600 uppercase tracking-wider mb-2">Final Overall Score</p>
                    <p className="text-5xl font-black text-blue-700">{score.toFixed(1)}%</p>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-6 flex-1 text-center border border-gray-200 shadow-sm">
                    <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Cohort Rank</p>
                    <p className="text-5xl font-black text-gray-800">#{rank}</p>
                  </div>
                </div>

                {/* Breakdown */}
                <div className="mb-10">
                  <h3 className="text-xl font-bold text-gray-800 mb-4 border-b-2 pb-2">Score Breakdown</h3>
                  <div className="grid grid-cols-2 gap-6">
                    {details.aptitudeScore != null && (
                      <div className="bg-gray-50 p-5 rounded-xl border">
                        <p className="text-sm font-bold text-gray-500 uppercase mb-1">Aptitude Test</p>
                        <p className="text-2xl font-bold text-gray-800">{details.aptitudeScore}%</p>
                      </div>
                    )}
                    <div className="bg-gray-50 p-5 rounded-xl border">
                      <p className="text-sm font-bold text-gray-500 uppercase mb-1">Interview Overall</p>
                      <p className="text-2xl font-bold text-gray-800">
                        {details.scores.length > 0 ? (
                          (details.scores.reduce((acc: number, s: any) => acc + (s.final_question_score || 0), 0) / 
                          details.scores.reduce((acc: number, s: any) => acc + (s.questions?.max_marks || 10), 0) * 100).toFixed(1)
                        ) : "0"}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* Interviewer Notes */}
                {details.notes && details.notes.length > 0 && (
                  <div className="mb-10">
                    <h3 className="text-xl font-bold text-gray-800 mb-4 border-b-2 pb-2">Interviewer Notes</h3>
                    <div className="space-y-3">
                      {details.notes.map((n: any, i: number) => (
                        <div key={i} className="bg-gray-50 p-4 rounded-xl border-l-4 border-blue-500">
                          <p className="text-sm font-bold text-gray-800 mb-1">{n.user_name}</p>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{n.notes}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="mt-12 pt-6 border-t-2 border-gray-200 text-center text-sm font-medium text-gray-400 flex justify-between items-center">
                  <span>Jade BPO Interview Hub</span>
                  <span>Generated on {new Date().toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
