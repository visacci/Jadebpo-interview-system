import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Search, Eye, UserCheck, UserX, Copy, ExternalLink, Calendar, Clock, Trash2, PauseCircle, PlayCircle, Edit } from "lucide-react";

export default function JobApplications() {
  const { jobId } = useParams<{ jobId: string }>();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteAppDialogOpen, setDeleteAppDialogOpen] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [interviewDate, setInterviewDate] = useState("");
  const [interviewTime, setInterviewTime] = useState("");

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDepartmentId, setEditDepartmentId] = useState("");

  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data } = await supabase.from("departments").select("*").order("name");
      return data ?? [];
    },
  });

  const { data: job, refetch: refetchJob } = useQuery({
    queryKey: ["job", jobId],
    queryFn: async () => {
      const { data } = await supabase.from("jobs").select("*, departments(name)").eq("id", jobId!).single();
      return data;
    },
  });

  const { data: applications } = useQuery({
    queryKey: ["applications", jobId],
    queryFn: async () => {
      const { data } = await supabase
        .from("applications")
        .select("*")
        .eq("job_id", jobId!)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!jobId,
  });

  const pendingCount = applications?.filter((a) => a.status === "pending").length ?? 0;
  const invitedCount = applications?.filter((a) => a.status === "invited").length ?? 0;

  const selectedApp = applications?.find((a) => a.id === selectedAppId);

  const inviteMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAppId || !interviewDate || !interviewTime) throw new Error("Missing fields");
      const { error } = await supabase.from("applications").update({
        status: "invited",
        interview_date: interviewDate,
        interview_time: interviewTime,
        aptitude_status: "pending",
        aptitude_score: null,
        aptitude_started_at: null,
      }).eq("id", selectedAppId);
      if (error) throw error;

      // Clear previous aptitude answers
      await supabase.from("aptitude_answers").delete().eq("application_id", selectedAppId);

      await supabase.functions.invoke("send-interview-email", {
        body: {
          type: "invite",
          to: selectedApp?.email,
          applicantName: selectedApp?.applicant_name,
          jobTitle: job?.title,
          interviewDate,
          interviewTime,
          applicationId: selectedAppId,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications", jobId] });
      toast.success("Applicant invited for interview! Email sent.");
      setInviteDialogOpen(false);
      setInterviewDate("");
      setInterviewTime("");
      setSelectedAppId(null);
    },
    onError: () => toast.error("Failed to invite applicant"),
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAppId) throw new Error("No app selected");
      const { error } = await supabase.from("applications").update({ status: "rejected" }).eq("id", selectedAppId);
      if (error) throw error;

      await supabase.functions.invoke("send-interview-email", {
        body: {
          type: "rejection",
          to: selectedApp?.email,
          applicantName: selectedApp?.applicant_name,
          jobTitle: job?.title,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications", jobId] });
      toast.success("Applicant rejected. Email sent.");
      setRejectDialogOpen(false);
      setSelectedAppId(null);
    },
    onError: () => toast.error("Failed to reject applicant"),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async () => {
      const newStatus = job?.status === "open" ? "paused" : "open";
      const { error } = await supabase.from("jobs").update({ status: newStatus }).eq("id", jobId!);
      if (error) throw error;
    },
    onSuccess: () => {
      refetchJob();
      queryClient.invalidateQueries({ queryKey: ["jobs-list"] });
      toast.success(job?.status === "open" ? "Applications paused" : "Applications resumed");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      // Delete aptitude questions first
      await supabase.from("aptitude_questions").delete().eq("job_id", jobId!);
      // Delete application documents and answers
      const { data: apps } = await supabase.from("applications").select("id").eq("job_id", jobId!);
      if (apps && apps.length > 0) {
        const appIds = apps.map((a) => a.id);
        await supabase.from("aptitude_answers").delete().in("application_id", appIds);
        await supabase.from("application_documents").delete().in("application_id", appIds);
        await supabase.from("applications").delete().eq("job_id", jobId!);
      }
      const { error } = await supabase.from("jobs").delete().eq("id", jobId!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Job deleted successfully");
      navigate("/dashboard");
    },
    onError: () => toast.error("Failed to delete job"),
  });
  
  const deleteApplicationMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAppId) throw new Error("No application selected");
      // Delete aptitude answers and documents first
      await supabase.from("aptitude_answers").delete().eq("application_id", selectedAppId);
      await supabase.from("application_documents").delete().eq("application_id", selectedAppId);
      // Delete the application itself
      const { error } = await supabase.from("applications").delete().eq("id", selectedAppId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications", jobId] });
      toast.success("Application deleted successfully");
      setDeleteAppDialogOpen(false);
      setSelectedAppId(null);
    },
    onError: (e: any) => toast.error("Failed to delete application: " + e.message),
  });

  const editJobMutation = useMutation({
    mutationFn: async () => {
      if (!editTitle.trim()) throw new Error("Title is required");
      const { error } = await supabase.from("jobs").update({
        title: editTitle.trim(),
        description: editDescription.trim(),
        department_id: editDepartmentId === "none" ? null : editDepartmentId || null,
      }).eq("id", jobId!);
      if (error) throw error;
    },
    onSuccess: () => {
      refetchJob();
      queryClient.invalidateQueries({ queryKey: ["jobs-list"] });
      setEditDialogOpen(false);
      toast.success("Job updated successfully");
    },
    onError: () => toast.error("Failed to update job"),
  });

  const filtered = applications?.filter((a) =>
    a.applicant_name.toLowerCase().includes(search.toLowerCase()) ||
    a.email.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const applicationUrl = `${window.location.origin}/apply/${jobId}`;

  const copyLink = () => {
    navigator.clipboard.writeText(applicationUrl);
    toast.success("Application link copied!");
  };

  const statusColor = (s: string) => {
    if (s === "invited") return "bg-success/10 text-success border-success/30";
    if (s === "rejected") return "bg-destructive/10 text-destructive border-destructive/30";
    if (s === "interviewed") return "bg-primary/10 text-primary border-primary/30";
    return "bg-warning/10 text-warning border-warning/30";
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/dashboard">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-foreground">{job?.title ?? "Job"}</h1>
              <Badge variant={job?.status === "open" ? "default" : "secondary"}>{job?.status}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {(job as any)?.departments?.name} · {pendingCount} pending · {invitedCount} invited · {applications?.length ?? 0} total
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => toggleStatusMutation.mutate()}
              disabled={toggleStatusMutation.isPending}>
              {job?.status === "open" ? (
                <><PauseCircle className="h-4 w-4 mr-1" /> Pause</>
              ) : (
                <><PlayCircle className="h-4 w-4 mr-1" /> Resume</>
              )}
            </Button>
            <Button size="sm" variant="outline" onClick={() => {
                setEditTitle(job?.title || "");
                setEditDescription(job?.description || "");
                setEditDepartmentId(job?.department_id || "");
                setEditDialogOpen(true);
              }}>
              <Edit className="h-4 w-4 mr-1" /> Edit
            </Button>
            <Button size="sm" variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
              <Trash2 className="h-4 w-4 mr-1" /> Delete
            </Button>
          </div>
        </div>

        {/* Application link */}
        <Card className="border-primary/20">
          <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Application Link</p>
              <p className="text-xs text-muted-foreground truncate max-w-md">{applicationUrl}</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={copyLink}>
                <Copy className="h-4 w-4 mr-1" /> Copy
              </Button>
              <a href={applicationUrl} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="outline">
                  <ExternalLink className="h-4 w-4 mr-1" /> Open
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search applicants..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {/* Applications list */}
        <div className="space-y-3">
          {filtered.length === 0 && (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No applications yet</CardContent></Card>
          )}
          {filtered.map((app) => (
            <Card key={app.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{app.applicant_name}</span>
                      <Badge className={statusColor(app.status)} variant="outline">{app.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{app.email} · {app.phone} · Age {app.age}</p>
                    <p className="text-sm text-muted-foreground">
                      Aptitude Score: <span className="font-medium text-foreground">{app.aptitude_score ?? "N/A"}%</span>
                      {" · "}Applied: {new Date(app.created_at).toLocaleDateString()}
                    </p>
                    {app.status === "invited" && app.interview_date && (
                      <p className="text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3 inline mr-1" />
                        Interview: {app.interview_date} at {app.interview_time}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Link to={`/jobs/${jobId}/applications/${app.id}`}>
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4 mr-1" /> View
                      </Button>
                    </Link>
                    {app.status === "pending" && (
                      <>
                        <Button size="sm" className="bg-success hover:bg-success/90 text-success-foreground"
                          onClick={() => { setSelectedAppId(app.id); setInviteDialogOpen(true); }}>
                          <UserCheck className="h-4 w-4 mr-1" /> Invite
                        </Button>
                        <Button size="sm" variant="destructive"
                          onClick={() => { setSelectedAppId(app.id); setRejectDialogOpen(true); }}>
                          <UserX className="h-4 w-4 mr-1" /> Reject
                        </Button>
                      </>
                    )}
                    {app.status === "invited" && (
                      <Button size="sm" variant="outline" className="text-primary border-primary/30 hover:bg-primary/10"
                        onClick={() => {
                          setSelectedAppId(app.id);
                          setInterviewDate(app.interview_date || "");
                          setInterviewTime(app.interview_time || "");
                          setInviteDialogOpen(true);
                        }}>
                        <Copy className="h-4 w-4 mr-1" /> Resend
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => { setSelectedAppId(app.id); setDeleteAppDialogOpen(true); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Invite Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Interview</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Invite <span className="font-medium text-foreground">{selectedApp?.applicant_name}</span> for an interview.
              An email will be sent to <span className="font-medium text-foreground">{selectedApp?.email}</span>.
            </p>
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><Calendar className="h-4 w-4" /> Interview Date</Label>
              <Input type="date" value={interviewDate} onChange={(e) => setInterviewDate(e.target.value)} min={new Date().toISOString().split("T")[0]} />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><Clock className="h-4 w-4" /> Interview Time</Label>
              <Input type="time" value={interviewTime} onChange={(e) => setInterviewTime(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>Cancel</Button>
            <Button
              className="bg-success hover:bg-success/90 text-success-foreground"
              disabled={!interviewDate || !interviewTime || inviteMutation.isPending}
              onClick={() => inviteMutation.mutate()}
            >
              {inviteMutation.isPending ? "Sending..." : "Send Invite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Confirmation Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Rejection</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-4">
            Are you sure you want to reject <span className="font-medium text-foreground">{selectedApp?.applicant_name}</span>?
            A rejection email will be sent to {selectedApp?.email}.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" disabled={rejectMutation.isPending} onClick={() => rejectMutation.mutate()}>
              {rejectMutation.isPending ? "Sending..." : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Job</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-4">
            Are you sure you want to delete <span className="font-medium text-foreground">{job?.title}</span>?
            This will permanently remove the job and all {applications?.length ?? 0} applications.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate()}>
              {deleteMutation.isPending ? "Deleting..." : "Delete Job"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Application Confirmation Dialog */}
      <Dialog open={deleteAppDialogOpen} onOpenChange={setDeleteAppDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Application</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-4">
            Are you sure you want to delete the application from <span className="font-medium text-foreground">{selectedApp?.applicant_name}</span>?
            This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteAppDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteApplicationMutation.isPending} onClick={() => deleteApplicationMutation.mutate()}>
              {deleteApplicationMutation.isPending ? "Deleting..." : "Delete Application"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Job Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Job</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Job Title *</Label>
              <Input placeholder="e.g. Sales Executive" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea placeholder="Job description..." value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={4} />
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={editDepartmentId} onValueChange={setEditDepartmentId}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {departments?.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button disabled={!editTitle.trim() || editJobMutation.isPending} onClick={() => editJobMutation.mutate()}>
              {editJobMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
