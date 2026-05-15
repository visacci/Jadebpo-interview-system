import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Briefcase,
  Users,
  BarChart3,
  Plus,
  ArrowRight,
  ClipboardList,
  Settings,
} from "lucide-react";

export default function Index() {
  const { user, signOut } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["home-stats"],
    queryFn: async () => {
      const [jobs, candidates, applications] = await Promise.all([
        supabase.from("jobs").select("id", { count: "exact", head: true }),
        supabase
          .from("candidates")
          .select("id", { count: "exact", head: true }),
        supabase
          .from("applications")
          .select("id", { count: "exact", head: true }),
      ]);
      return {
        jobs: jobs.count ?? 0,
        candidates: candidates.count ?? 0,
        applications: applications.count ?? 0,
      };
    },
  });

  const { data: jobs } = useQuery({
    queryKey: ["jobs-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("jobs")
        .select("*, departments(name)")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  // Get application counts per job
  const { data: appCounts } = useQuery({
    queryKey: ["app-counts"],
    queryFn: async () => {
      const { data } = await supabase.from("applications").select("job_id");
      const counts: Record<string, number> = {};
      data?.forEach((a) => {
        counts[a.job_id] = (counts[a.job_id] || 0) + 1;
      });
      return counts;
    },
  });

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Hero */}
        <div
          className="rounded-2xl p-8 md:p-12 text-center space-y-4 animate-slide-up"
          style={{ background: "var(--gradient-hero)" }}
        >
          <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground">
            Jade BPO Hiring Platform
          </h1>
          <p className="text-primary-foreground/70 max-w-xl mx-auto">
            Manage job postings, review applications, conduct interviews, and
            make data-driven hiring decisions.
          </p>
          <Link to="/jobs/create">
            <Button
              size="lg"
              className="mt-4 bg-primary-foreground text-foreground hover:bg-primary-foreground/90"
            >
              <Plus className="mr-2 h-4 w-4" /> Create New Job
            </Button>
          </Link>
          <Link to="/" target="_blank" className="ml-2">
            <Button
              style={{ color: "black" }}
              size="lg"
              variant="outline"
              className="mt-4 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
            >
              View Careers Page
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="flex items-center gap-3 p-5">
              <div className="rounded-lg bg-primary/10 p-2.5">
                <Briefcase className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.jobs ?? 0}</p>
                <p className="text-sm text-muted-foreground">Jobs</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-5">
              <div className="rounded-lg bg-success/10 p-2.5">
                <Users className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.applications ?? 0}</p>
                <p className="text-sm text-muted-foreground">Applications</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-5">
              <div className="rounded-lg bg-warning/10 p-2.5">
                <ClipboardList className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.candidates ?? 0}</p>
                <p className="text-sm text-muted-foreground">Interviewed</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-4">
          <Link to="/jobs/create">
            <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer group">
              <CardContent className="p-6 space-y-2">
                <div className="inline-flex rounded-lg p-2.5 bg-primary text-primary-foreground">
                  <Plus className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-foreground group-hover:text-primary">
                  Create Job
                </h3>
                <p className="text-sm text-muted-foreground">
                  Post a new position with aptitude test
                </p>
              </CardContent>
            </Card>
          </Link>
          <Link to="/interview/setup">
            <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer group">
              <CardContent className="p-6 space-y-2">
                <div className="inline-flex rounded-lg p-2.5 bg-success text-success-foreground">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-foreground group-hover:text-primary">
                  Start Interview
                </h3>
                <p className="text-sm text-muted-foreground">
                  Conduct a structured interview session
                </p>
              </CardContent>
            </Card>
          </Link>
          <Link to="/results">
            <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer group">
              <CardContent className="p-6 space-y-2">
                <div className="inline-flex rounded-lg p-2.5 bg-warning text-warning-foreground">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-foreground group-hover:text-primary">
                  View Results
                </h3>
                <p className="text-sm text-muted-foreground">
                  Rankings, scores, and analytics
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Jobs List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">Active Jobs</h2>
            <Link to="/jobs/create">
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" /> New Job
              </Button>
            </Link>
          </div>
          {jobs?.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No jobs yet. Create your first job posting!
              </CardContent>
            </Card>
          )}
          {jobs?.map((job) => (
            <Link key={job.id} to={`/jobs/${job.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer mb-3">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">
                        {job.title}
                      </span>
                      <Badge
                        variant={
                          job.status === "open" ? "default" : "secondary"
                        }
                      >
                        {job.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {(job as any).departments?.name ?? "No department"} ·{" "}
                      {appCounts?.[job.id] ?? 0} applications ·{" "}
                      {new Date(job.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  );
}
