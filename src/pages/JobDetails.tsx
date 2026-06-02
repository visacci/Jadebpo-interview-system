import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Building2,
  CalendarDays,
  CheckCircle2,
  FileText,
  MapPin,
} from "lucide-react";

function splitDescription(text: string | null) {
  if (!text) return [];
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export default function JobDetails() {
  const { jobId } = useParams<{ jobId: string }>();

  const { data: job, isLoading } = useQuery({
    queryKey: ["public-job-details", jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*, departments(name)")
        .eq("id", jobId!)
        .eq("status", "open")
        .single();

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading job details...</p>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-xl w-full">
          <CardContent className="p-8 text-center space-y-4">
            <h1 className="text-2xl font-bold text-foreground">Job not found</h1>
            <p className="text-muted-foreground">
              This position is unavailable or no longer accepting applications.
            </p>
            <Link to="/">
              <Button>Back to Careers</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const details = splitDescription(job.description);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-card/85 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to Careers
          </Link>
          <img src="/images/logo.png" alt="Jade BPO" className="h-8 object-contain" />
        </div>
      </header>

      <main className="container py-8 md:py-12 space-y-6">
        <section className="rounded-2xl border bg-gradient-to-br from-card to-secondary/30 p-6 md:p-8 space-y-6">
          <div className="space-y-3">
            <Badge className="w-fit">Open Position</Badge>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">{job.title}</h1>
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-primary" />
                {(job as any).departments?.name ?? "Jade BPO"}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-primary" />
                Uganda
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4 text-primary" />
                Posted {new Date(job.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link to={`/apply/${job.id}`}>
              <Button size="lg" className="gap-2">
                Apply Now
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/">
              <Button size="lg" variant="outline">
                View More Jobs
              </Button>
            </Link>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardContent className="p-6 space-y-5">
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">Job Details</h2>
              </div>

              {details.length > 0 ? (
                <div className="space-y-3 text-sm md:text-base text-muted-foreground">
                  {details.map((item, idx) => (
                    <p key={`${job.id}-${idx}`}>{item}</p>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">
                  Detailed information for this role will be shared during the application process.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 space-y-5">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">Application Notes</h2>
              </div>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  Prepare your CV/Resume and national ID copy in PDF format.
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  Ensure your contact details are accurate for interview follow-up.
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  You may be asked to complete an aptitude test after applying.
                </li>
              </ul>
              <Link to={`/apply/${job.id}`} className="block">
                <Button className="w-full gap-2">
                  Continue to Application
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
