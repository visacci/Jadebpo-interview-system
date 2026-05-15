import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Briefcase } from "lucide-react";

export default function CreateJob() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [departmentId, setDepartmentId] = useState("");

  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data } = await supabase.from("departments").select("*").order("name");
      return data ?? [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: job, error } = await supabase
        .from("jobs")
        .insert({
          title: title.trim(),
          description: description.trim(),
          department_id: departmentId || null,
          created_by: user!.id,
        })
        .select()
        .single();
      if (error) throw error;
      return job;
    },
    onSuccess: () => {
      toast.success("Job created successfully!");
      navigate("/dashboard");
    },
    onError: () => toast.error("Failed to create job"),
  });

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6 animate-slide-up">
        <h1 className="text-2xl font-bold text-foreground">Create New Job</h1>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" /> Job Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Job Title *</Label>
              <Input placeholder="e.g. Sales Executive" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea placeholder="Job description and requirements..." value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
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
            <p className="text-sm text-muted-foreground">
              Aptitude test questions are configured globally in Settings and apply to all jobs.
            </p>
          </CardContent>
        </Card>

        <Button className="w-full" size="lg" disabled={!title.trim() || createMutation.isPending}
          onClick={() => createMutation.mutate()}>
          {createMutation.isPending ? "Creating..." : "Create Job & Generate Application Link"}
        </Button>
      </div>
    </Layout>
  );
}
