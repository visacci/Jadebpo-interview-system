import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Briefcase,
  MapPin,
  Search,
  ArrowRight,
  Building2,
  Users,
  Clock,
} from "lucide-react";

export default function Careers() {
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");

  const { data: jobs } = useQuery({
    queryKey: ["public-jobs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("jobs")
        .select("*, departments(name)")
        .eq("status", "open")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: departments } = useQuery({
    queryKey: ["public-departments"],
    queryFn: async () => {
      const { data } = await supabase
        .from("departments")
        .select("*")
        .order("name");
      return data ?? [];
    },
  });

  const { data: appCounts } = useQuery({
    queryKey: ["public-app-counts"],
    queryFn: async () => {
      const { data } = await supabase.from("applications").select("job_id");
      const counts: Record<string, number> = {};
      data?.forEach((a) => {
        counts[a.job_id] = (counts[a.job_id] || 0) + 1;
      });
      return counts;
    },
  });

  const filtered =
    jobs?.filter((j) => {
      const matchSearch =
        j.title.toLowerCase().includes(search.toLowerCase()) ||
        (j.description ?? "").toLowerCase().includes(search.toLowerCase());
      const matchDept =
        selectedDept === "all" || j.department_id === selectedDept;
      return matchSearch && matchDept;
    }) ?? [];

  const jobsByDept =
    departments
      ?.map((d) => ({
        ...d,
        jobs: filtered.filter((j) => j.department_id === d.id),
      }))
      .filter((d) => d.jobs.length > 0) ?? [];

  const uncategorized = filtered.filter((j) => !j.department_id);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src="/images/logo.png"
              alt="Jade BPO"
              className="h-8 object-contain"
            />
          </div>
          <Link to="/auth">
            <Button variant="outline" size="sm">
              HR Login
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "url('/images/careers.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0.6) 100%)",
          }}
        />
        <div className="relative container py-16 md:py-24">
          <div className="space-y-6 text-center max-w-3xl mx-auto">
            <Badge className="bg-primary/20 text-primary-foreground border-primary-foreground/20 text-sm px-4 py-1">
              We're Hiring!
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground leading-tight">
              Build Your Career
              <br />
              with Jade BPO
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/70">
              Join our growing team and make an impact. Browse open positions
              below and apply today — no account required.
            </p>
            <div className="flex items-center gap-6 justify-center text-primary-foreground/60 text-sm">
              <span className="flex items-center gap-1">
                <Briefcase className="h-4 w-4" /> {jobs?.length ?? 0} Open
                Positions
              </span>
              <span className="flex items-center gap-1">
                <Building2 className="h-4 w-4" /> {departments?.length ?? 0}{" "}
                Departments
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Search & Filters */}
      <div className="container -mt-6 relative z-10">
        <Card className="shadow-lg">
          <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search positions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={selectedDept === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedDept("all")}
              >
                All
              </Button>
              {departments?.map((d) => (
                <Button
                  key={d.id}
                  variant={selectedDept === d.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedDept(d.id)}
                >
                  {d.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Job Listings */}
      <div className="container py-10 space-y-8">
        {filtered.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Briefcase className="h-12 w-12 text-muted-foreground mx-auto" />
            <h2 className="text-xl font-semibold text-foreground">
              No open positions found
            </h2>
            <p className="text-muted-foreground">
              Check back later for new opportunities.
            </p>
          </div>
        ) : (
          <>
            {jobsByDept.map((dept) => (
              <div key={dept.id} className="space-y-4">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-bold text-foreground">
                    {dept.name}
                  </h2>
                  <Badge variant="secondary">{dept.jobs.length}</Badge>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  {dept.jobs.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      appCount={appCounts?.[job.id] ?? 0}
                    />
                  ))}
                </div>
              </div>
            ))}
            {uncategorized.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-foreground">
                  Other Positions
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {uncategorized.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      appCount={appCounts?.[job.id] ?? 0}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t bg-card py-8">
        <div className="container text-center space-y-2">
          <div className="flex items-center justify-center">
            <img src="/images/logo.png" alt="Jade BPO" className="h-8 object-contain" />
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Jade BPO. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground">
            Questions? Contact us at{" "}
            <a
              href="mailto:hr@jadebpo.com"
              className="text-primary hover:underline"
            >
              hr@jadebpo.com
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

function JobCard({ job, appCount }: { job: any; appCount: number }) {
  return (
    <Link to={`/apply/${job.id}`}>
      <Card className="h-full hover:shadow-lg hover:border-primary/30 transition-all cursor-pointer group">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors text-lg">
                {job.title}
              </h3>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                {job.departments?.name && (
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" /> {job.departments.name}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />{" "}
                  {new Date(job.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
          </div>
          {job.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {job.description}
            </p>
          )}
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              <Users className="h-3 w-3 mr-1" /> {appCount} applicant
              {appCount !== 1 ? "s" : ""}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
