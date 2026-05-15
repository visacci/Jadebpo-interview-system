import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, FolderOpen, Brain, Image, Edit } from "lucide-react";

export default function Settings() {
  const queryClient = useQueryClient();
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [newDeptName, setNewDeptName] = useState("");
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
  const [editDeptName, setEditDeptName] = useState("");
  const [newQuestion, setNewQuestion] = useState("");
  const [newMaxMarks, setNewMaxMarks] = useState("10");

  // Aptitude test state
  const [aptQ, setAptQ] = useState("");
  const [aptOptions, setAptOptions] = useState(["", "", "", ""]);
  const [aptCorrectIdx, setAptCorrectIdx] = useState(0);
  const [aptMaxMarks, setAptMaxMarks] = useState("5");
  const [aptCategory, setAptCategory] = useState("");
  const [aptImageUrl, setAptImageUrl] = useState("");

  // Edit Aptitude test state
  const [editingAptQId, setEditingAptQId] = useState<string | null>(null);
  const [editAptQ, setEditAptQ] = useState("");
  const [editAptOptions, setEditAptOptions] = useState(["", "", "", ""]);
  const [editAptCorrectIdx, setEditAptCorrectIdx] = useState(0);
  const [editAptMaxMarks, setEditAptMaxMarks] = useState("5");
  const [editAptCategory, setEditAptCategory] = useState("");
  const [editAptImageUrl, setEditAptImageUrl] = useState("");

  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data } = await supabase.from("departments").select("*").order("name");
      return data ?? [];
    },
  });

  const { data: questions } = useQuery({
    queryKey: ["questions", selectedDept],
    queryFn: async () => {
      const { data } = await supabase
        .from("questions")
        .select("*")
        .eq("department_id", selectedDept!)
        .order("order_index");
      return data ?? [];
    },
    enabled: !!selectedDept,
  });

  const { data: aptitudeQuestions } = useQuery({
    queryKey: ["global-aptitude-questions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("aptitude_questions")
        .select("*")
        .is("job_id", null)
        .order("order_index");
      return data ?? [];
    },
  });

  const addDept = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("departments").insert({ name: newDeptName.trim() });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["departments"] }); setNewDeptName(""); toast.success("Department added"); },
    onError: () => toast.error("Failed to add department"),
  });

  const deleteDept = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("departments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["departments"] }); setSelectedDept(null); toast.success("Deleted"); },
    onError: () => toast.error("Cannot delete: department may have candidates"),
  });

  const updateDept = useMutation({
    mutationFn: async ({ id, name }: { id: string, name: string }) => {
      const { error } = await supabase.from("departments").update({ name: name.trim() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      setEditingDeptId(null);
      toast.success("Department updated");
    },
    onError: () => toast.error("Failed to update department"),
  });

  const addQ = useMutation({
    mutationFn: async () => {
      const nextOrder = (questions?.length ?? 0) + 1;
      const { error } = await supabase.from("questions").insert({
        department_id: selectedDept!,
        question_text: newQuestion.trim(),
        order_index: nextOrder,
        max_marks: parseFloat(newMaxMarks) || 10,
      });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["questions"] }); setNewQuestion(""); setNewMaxMarks("10"); toast.success("Question added"); },
  });

  const deleteQ = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("questions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["questions"] }); toast.success("Deleted"); },
  });

  const addAptQ = useMutation({
    mutationFn: async () => {
      if (aptOptions.some((o) => !o.trim())) throw new Error("Fill all options");
      const nextOrder = (aptitudeQuestions?.length ?? 0) + 1;
      const { error } = await supabase.from("aptitude_questions").insert({
        job_id: null,
        question_text: aptQ.trim(),
        options: aptOptions.map((o) => o.trim()),
        correct_answer: aptOptions[aptCorrectIdx].trim(),
        order_index: nextOrder,
        max_marks: parseFloat(aptMaxMarks) || 5,
        category: aptCategory.trim() || null,
        image_url: aptImageUrl.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["global-aptitude-questions"] });
      setAptQ(""); setAptOptions(["", "", "", ""]); setAptCorrectIdx(0); setAptMaxMarks("5"); setAptCategory(""); setAptImageUrl("");
      toast.success("Aptitude question added");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateAptQ = useMutation({
    mutationFn: async () => {
      if (editAptOptions.some((o) => !o.trim())) throw new Error("Fill all options");
      const { error } = await supabase.from("aptitude_questions").update({
        question_text: editAptQ.trim(),
        options: editAptOptions.map((o) => o.trim()),
        correct_answer: editAptOptions[editAptCorrectIdx].trim(),
        max_marks: parseFloat(editAptMaxMarks) || 5,
        category: editAptCategory.trim() || null,
        image_url: editAptImageUrl.trim() || null,
      }).eq("id", editingAptQId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["global-aptitude-questions"] });
      setEditingAptQId(null);
      toast.success("Aptitude question updated");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteAptQ = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("aptitude_questions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["global-aptitude-questions"] }); toast.success("Deleted"); },
  });

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>

        {/* Aptitude Test Questions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" /> Aptitude Test Questions
              <Badge variant="secondary" className="ml-auto">{aptitudeQuestions?.length ?? 0} questions</Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground">These questions are the same for all applicants (20-minute test)</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {aptitudeQuestions?.map((q, i) => (
                <div key={q.id} className="bg-secondary/50 rounded-lg p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-bold text-muted-foreground mt-1 min-w-[20px]">{i + 1}.</span>
                    <div className="flex-1">
                      {(q as any).category && <Badge variant="outline" className="text-xs mb-1">{(q as any).category}</Badge>}
                      <p className="text-sm text-foreground whitespace-pre-line">{q.question_text}</p>
                      {(q as any).image_url && (
                        <div className="flex items-center gap-1 mt-1">
                          <Image className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Has image(s)</span>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Max: {(q as any).max_marks ?? 5} marks · Correct: {q.correct_answer}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(q.options as string[]).map((opt, oi) => (
                          <span key={oi} className={`text-xs px-2 py-0.5 rounded ${opt === q.correct_answer ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"}`}>
                            {String.fromCharCode(65 + oi)}. {opt}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                        onClick={() => {
                          setEditingAptQId(q.id);
                          setEditAptQ(q.question_text);
                          setEditAptCategory((q as any).category || "");
                          setEditAptImageUrl((q as any).image_url || "");
                          setEditAptMaxMarks((q as any).max_marks?.toString() || "5");
                          
                          const opts = [...(q.options as string[])];
                          while (opts.length < 4) opts.push("");
                          setEditAptOptions(opts);
                          const correctIdx = opts.findIndex(o => o === q.correct_answer);
                          setEditAptCorrectIdx(correctIdx >= 0 ? correctIdx : 0);
                        }}>
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                        onClick={() => deleteAptQ.mutate(q.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border rounded-lg p-4 space-y-3">
              <Label className="text-sm font-semibold">Add Aptitude Question</Label>
              <Input placeholder="Question text" value={aptQ} onChange={(e) => setAptQ(e.target.value)} />
              <Input placeholder="Category (e.g. Numerical Reasoning)" value={aptCategory} onChange={(e) => setAptCategory(e.target.value)} />
              <Input placeholder="Image URL (optional, comma-separated for multiple)" value={aptImageUrl} onChange={(e) => setAptImageUrl(e.target.value)} />
              <div className="grid grid-cols-1 gap-2">
                {aptOptions.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input type="radio" name="aptCorrect" checked={aptCorrectIdx === i}
                      onChange={() => setAptCorrectIdx(i)} className="accent-primary" />
                    <Input placeholder={`Option ${String.fromCharCode(65 + i)}`} value={opt}
                      onChange={(e) => { const c = [...aptOptions]; c[i] = e.target.value; setAptOptions(c); }} />
                    {aptOptions.length > 2 && (
                      <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0"
                        onClick={() => {
                          const c = aptOptions.filter((_, idx) => idx !== i);
                          setAptOptions(c);
                          if (aptCorrectIdx === i) setAptCorrectIdx(0);
                          else if (aptCorrectIdx > i) setAptCorrectIdx(aptCorrectIdx - 1);
                        }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" size="sm"
                onClick={() => setAptOptions([...aptOptions, ""])}>
                <Plus className="h-3 w-3 mr-1" /> Add Option
              </Button>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">Max Marks:</Label>
                <Input type="number" className="w-20" min={1} value={aptMaxMarks}
                  onChange={(e) => setAptMaxMarks(e.target.value)} />
              </div>
              <p className="text-xs text-muted-foreground">Select the radio button next to the correct answer</p>
              <Button variant="outline" size="sm" onClick={() => aptQ.trim() && addAptQ.mutate()} disabled={!aptQ.trim()}>
                <Plus className="h-4 w-4 mr-1" /> Add Question
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Departments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-primary" /> Departments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input placeholder="New department" value={newDeptName} onChange={(e) => setNewDeptName(e.target.value)} />
                <Button size="sm" onClick={() => newDeptName.trim() && addDept.mutate()} disabled={!newDeptName.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-1">
                {departments?.map((d) => (
                  <div key={d.id}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                      selectedDept === d.id ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
                    }`}
                    onClick={() => setSelectedDept(d.id)}>
                    {editingDeptId === d.id ? (
                      <div className="flex gap-2 items-center flex-1 mr-2" onClick={(e) => e.stopPropagation()}>
                        <Input 
                          value={editDeptName} 
                          onChange={(e) => setEditDeptName(e.target.value)}
                          className={`h-7 text-sm ${selectedDept === d.id ? "text-foreground bg-primary-foreground/10" : "text-foreground bg-background"}`}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && editDeptName.trim()) {
                              updateDept.mutate({ id: d.id, name: editDeptName });
                            } else if (e.key === 'Escape') {
                              setEditingDeptId(null);
                            }
                          }}
                        />
                        <Button size="sm" variant={selectedDept === d.id ? "secondary" : "default"} className="h-7 px-2" onClick={() => editDeptName.trim() && updateDept.mutate({ id: d.id, name: editDeptName })}>Save</Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditingDeptId(null)}>Cancel</Button>
                      </div>
                    ) : (
                      <>
                        <span className="text-sm font-medium">{d.name}</span>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingDeptId(d.id);
                              setEditDeptName(d.name);
                            }}>
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                            onClick={(e) => { e.stopPropagation(); deleteDept.mutate(d.id); }}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Interview Questions */}
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedDept ? `Interview Questions (${questions?.length ?? 0})` : "Select a department"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {selectedDept && (
                <>
                  <div className="space-y-2">
                    <Input placeholder="New question" value={newQuestion} onChange={(e) => setNewQuestion(e.target.value)} />
                    <div className="flex gap-2 items-center">
                      <Label className="text-xs text-muted-foreground whitespace-nowrap">Max Marks:</Label>
                      <Input type="number" className="w-20" min={1} value={newMaxMarks}
                        onChange={(e) => setNewMaxMarks(e.target.value)} />
                      <Button size="sm" onClick={() => newQuestion.trim() && addQ.mutate()} disabled={!newQuestion.trim()}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {questions?.map((q, i) => (
                      <div key={q.id} className="flex items-start gap-2 bg-secondary/50 rounded-lg p-2">
                        <span className="text-xs font-bold text-muted-foreground mt-1 min-w-[20px]">{i + 1}.</span>
                        <div className="flex-1">
                          <p className="text-sm text-foreground">{q.question_text}</p>
                          <p className="text-xs text-muted-foreground">Max: {q.max_marks} marks</p>
                        </div>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0"
                          onClick={() => deleteQ.mutate(q.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Aptitude Question Dialog */}
      <Dialog open={!!editingAptQId} onOpenChange={(open) => !open && setEditingAptQId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Aptitude Question</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="space-y-2">
              <Label>Question Text</Label>
              <Input placeholder="Question text" value={editAptQ} onChange={(e) => setEditAptQ(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Input placeholder="e.g. Numerical Reasoning" value={editAptCategory} onChange={(e) => setEditAptCategory(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Image URL (optional)</Label>
              <Input placeholder="comma-separated for multiple" value={editAptImageUrl} onChange={(e) => setEditAptImageUrl(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Options & Correct Answer</Label>
              <div className="grid grid-cols-1 gap-2">
                {editAptOptions.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input type="radio" name="editAptCorrect" checked={editAptCorrectIdx === i}
                      onChange={() => setEditAptCorrectIdx(i)} className="accent-primary" />
                    <Input placeholder={`Option ${String.fromCharCode(65 + i)}`} value={opt}
                      onChange={(e) => { const c = [...editAptOptions]; c[i] = e.target.value; setEditAptOptions(c); }} />
                    {editAptOptions.length > 2 && (
                      <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0"
                        onClick={() => {
                          const c = editAptOptions.filter((_, idx) => idx !== i);
                          setEditAptOptions(c);
                          if (editAptCorrectIdx === i) setEditAptCorrectIdx(0);
                          else if (editAptCorrectIdx > i) setEditAptCorrectIdx(editAptCorrectIdx - 1);
                        }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" size="sm"
                onClick={() => setEditAptOptions([...editAptOptions, ""])}>
                <Plus className="h-3 w-3 mr-1" /> Add Option
              </Button>
              <p className="text-xs text-muted-foreground mt-1">Select the radio button next to the correct answer</p>
            </div>
            <div className="space-y-2">
              <Label>Max Marks</Label>
              <Input type="number" min={1} value={editAptMaxMarks} onChange={(e) => setEditAptMaxMarks(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingAptQId(null)}>Cancel</Button>
            <Button disabled={!editAptQ.trim() || updateAptQ.isPending} onClick={() => updateAptQ.mutate()}>
              {updateAptQ.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
