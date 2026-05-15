import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Mail, Phone, User } from "lucide-react";

export default function PendingInterviews() {
  const { data: invitedApps } = useQuery({
    queryKey: ["pending-interviews"],
    queryFn: async () => {
      const { data } = await supabase
        .from("applications")
        .select("*, jobs(title, departments(name))")
        .eq("status", "invited")
        .order("interview_date", { ascending: true });
      return data ?? [];
    },
  });

  const today = new Date().toISOString().split("T")[0];
  const upcoming = invitedApps?.filter((a) => !a.interview_date || a.interview_date >= today) ?? [];
  const past = invitedApps?.filter((a) => a.interview_date && a.interview_date < today) ?? [];

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Pending Interviews</h1>
        <p className="text-muted-foreground">Applicants invited for interview who haven't been interviewed yet.</p>

        {invitedApps?.length === 0 && (
          <Card><CardContent className="p-8 text-center text-muted-foreground">No pending interviews</CardContent></Card>
        )}

        {upcoming.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Upcoming</h2>
            {upcoming.map((app) => (
              <InterviewCard key={app.id} app={app} />
            ))}
          </div>
        )}

        {past.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              Overdue <Badge variant="destructive">{past.length}</Badge>
            </h2>
            {past.map((app) => (
              <InterviewCard key={app.id} app={app} overdue />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

function InterviewCard({ app, overdue }: { app: any; overdue?: boolean }) {
  return (
    <Card className={overdue ? "border-destructive/30" : "border-primary/20"}>
      <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            <span className="font-semibold text-foreground">{app.applicant_name}</span>
            {overdue && <Badge variant="destructive" className="text-xs">Overdue</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">{(app as any).jobs?.title} · {(app as any).jobs?.departments?.name}</p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {app.email}</span>
            <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {app.phone}</span>
          </div>
        </div>
        <div className="text-right space-y-1">
          {app.interview_date && (
            <p className="text-sm font-medium text-foreground flex items-center gap-1 justify-end">
              <Calendar className="h-3 w-3" /> {app.interview_date}
            </p>
          )}
          {app.interview_time && (
            <p className="text-sm text-muted-foreground flex items-center gap-1 justify-end">
              <Clock className="h-3 w-3" /> {app.interview_time}
            </p>
          )}
          <p className="text-xs text-muted-foreground">Aptitude: {app.aptitude_score ?? "N/A"}%</p>
        </div>
      </CardContent>
    </Card>
  );
}
