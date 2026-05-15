import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { CheckCircle, FileText, Send, Loader2 } from "lucide-react";

const REQUIRED_DOCS = [
  { key: "cv", label: "CV / Resume" },
  { key: "application_letter", label: "Application Letter" },
  { key: "national_id", label: "Copy of National ID" },
] as const;

const EDUCATION_DOCS = [
  { key: "uace_results", label: "UACE Results" },
  { key: "uce_results", label: "UCE Results" },
  { key: "university_documents", label: "University Documents" },
] as const;

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export default function ApplicationForm() {
  const { jobId } = useParams<{ jobId: string }>();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [salaryExpectation, setSalaryExpectation] = useState("");
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [submitted, setSubmitted] = useState(false);
  const [step, setStep] = useState(0);

  const { data: job } = useQuery({
    queryKey: ["job", jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*, departments(name)")
        .eq("id", jobId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const handleFileChange = (key: string, file: File | null) => {
    if (file && file.size > MAX_FILE_SIZE) {
      toast.error("File must be under 5MB");
      return;
    }
    // Mobile browsers sometimes report empty or generic MIME types for PDFs.
    // Accept by extension as a fallback.
    if (file) {
      const isPdfByName = file.name.toLowerCase().endsWith(".pdf");
      const isPdfByMime = file.type === "application/pdf";
      if (!isPdfByMime && !isPdfByName) {
        toast.error("Only PDF files are accepted");
        return;
      }
    }
    setFiles((prev) => ({ ...prev, [key]: file }));
  };

  // Retry helper for flaky mobile networks
  const withRetry = async <T,>(fn: () => Promise<T>, retries = 3, delayMs = 1500): Promise<T> => {
    let lastErr: any;
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (err: any) {
        lastErr = err;
        const msg = String(err?.message || err || "");
        const isNetwork = msg.includes("Failed to fetch") || msg.includes("NetworkError") || msg.includes("network") || msg.includes("timeout");
        if (!isNetwork || i === retries - 1) throw err;
        await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
      }
    }
    throw lastErr;
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!navigator.onLine) {
        throw new Error("You appear to be offline. Please check your internet connection and try again.");
      }

      const appId = crypto.randomUUID();
      await withRetry(async () => {
        const { error: appErr } = await supabase.from("applications").insert({
          id: appId,
          job_id: jobId!,
          applicant_name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          age: parseInt(age),
          salary_expectation: salaryExpectation.trim() || null,
        });
        if (appErr) throw appErr;
      });

      for (const [key, file] of Object.entries(files)) {
        if (!file) continue;
        const filePath = `${appId}/${key}_${Date.now()}.pdf`;
        await withRetry(async () => {
          const { error: upErr } = await supabase.storage
            .from("applicant-documents")
            .upload(filePath, file, {
              contentType: "application/pdf",
              upsert: true,
            });
          if (upErr) throw upErr;
        });

        await withRetry(async () => {
          const { error: docErr } = await supabase
            .from("application_documents")
            .insert({
              application_id: appId,
              document_type: key,
              file_path: filePath,
              file_name: file.name,
            });
          if (docErr) throw docErr;
        });
      }

      // Send confirmation email (non-blocking)
      try {
        await supabase.functions.invoke("send-interview-email", {
          body: {
            type: "application_received",
            to: email.trim(),
            applicantName: name.trim(),
            jobTitle: job?.title ?? "the position",
          },
        });
      } catch (emailErr) {
        console.error("Confirmation email failed:", emailErr);
      }
    },
    onSuccess: () => setSubmitted(true),
    onError: (e: any) => {
      const msg = String(e?.message || e || "");
      let friendly = msg;
      if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
        friendly = "Network connection problem. Please check your internet (try Wi-Fi if on mobile data) and try again. Your large files may be timing out.";
      }
      toast.error("Submission failed: " + friendly, { duration: 8000 });
    },
    retry: false,
  });

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-success mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">
              Application Submitted!
            </h1>
            <p className="text-muted-foreground">
              Thank you for applying. We will review your application and
              contact you via email.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading job details...</p>
      </div>
    );
  }

  if (job.status !== "open") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <h1 className="text-xl font-bold text-foreground">
              Applications Closed
            </h1>
            <p className="text-muted-foreground">
              This position is no longer accepting applications. Please check
              our careers page for other opportunities.
            </p>
            <a href="/">
              <Button>Browse Open Positions</Button>
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  const allRequiredDocsUploaded = REQUIRED_DOCS.every((d) => files[d.key]);
  const canSubmit =
    name.trim() &&
    email.trim() &&
    phone.trim() &&
    age &&
    allRequiredDocsUploaded;

  return (
    <div className="min-h-screen bg-background">
      {submitMutation.isPending && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full animate-in fade-in zoom-in duration-300">
            <CardContent className="p-8 text-center space-y-4">
              <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto" />
              <h2 className="text-xl font-bold text-foreground">Submitting Application...</h2>
              <p className="text-muted-foreground">
                Please wait while we upload your documents. This may take a few moments depending on your file sizes.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
      <div className="container max-w-2xl py-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <img src="/images/logo.png" alt="Jade BPO" className="h-10 object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{job.title}</h1>
          <p className="text-muted-foreground">
            {(job as any).departments?.name ?? "Jade BPO"}
          </p>
          {job.description && (
            <p className="text-sm text-muted-foreground max-w-lg mx-auto">
              {job.description}
            </p>
          )}
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-2">
          {["Details", "Documents", "Submit"].map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <button
                onClick={() => setStep(i)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                  step === i
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {label}
              </button>
              {i < 2 && <div className="w-4 h-px bg-border" />}
            </div>
          ))}
        </div>

        {/* Step 0: Personal details */}
        {step === 0 && (
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input
                  placeholder="Your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Email Address *</Label>
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone Number *</Label>
                <Input
                  placeholder="+256 700 000 000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Age *</Label>
                <Input
                  type="number"
                  placeholder="Age"
                  min={18}
                  max={99}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Salary Expectation</Label>
                <Input
                  // placeholder="e.g. UGX 1,500,000"
                  value={salaryExpectation}
                  onChange={(e) => setSalaryExpectation(e.target.value)}
                />
              </div>
              <Button
                className="w-full"
                onClick={() => setStep(1)}
                disabled={
                  !name.trim() || !email.trim() || !phone.trim() || !age
                }
              >
                Next: Upload Documents
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 1: Documents */}
        {step === 1 && (
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" /> Required Documents
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Upload PDF files only (max 5MB each)
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {REQUIRED_DOCS.map((doc) => (
                <div key={doc.key} className="space-y-1">
                  <Label className="flex items-center gap-2">
                    {doc.label} *
                    {files[doc.key] && (
                      <CheckCircle className="h-4 w-4 text-success" />
                    )}
                  </Label>
                  <Input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={(e) =>
                      handleFileChange(doc.key, e.target.files?.[0] ?? null)
                    }
                    className="text-sm"
                  />
                  {files[doc.key] && (
                    <p className="text-xs text-muted-foreground">
                      {files[doc.key]!.name}
                    </p>
                  )}
                </div>
              ))}

              <div className="border-t pt-4 mt-4">
                <p className="text-sm font-medium text-foreground mb-3">
                  Education Documents
                </p>
                {EDUCATION_DOCS.map((doc) => (
                  <div key={doc.key} className="space-y-1 mb-3">
                    <Label className="flex items-center gap-2">
                      {doc.label}
                      {files[doc.key] && (
                        <CheckCircle className="h-4 w-4 text-success" />
                      )}
                    </Label>
                    <Input
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={(e) =>
                        handleFileChange(doc.key, e.target.files?.[0] ?? null)
                      }
                      className="text-sm"
                    />
                    {files[doc.key] && (
                      <p className="text-xs text-muted-foreground">
                        {files[doc.key]!.name}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(0)}>
                  Back
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => setStep(2)}
                  disabled={!allRequiredDocsUploaded}
                >
                  Next: Review & Submit
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Review & submit */}
        {step === 2 && (
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle>Review & Submit</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-secondary/50 rounded-lg p-4 space-y-2 text-sm">
                <p>
                  <span className="font-medium">Name:</span> {name}
                </p>
                <p>
                  <span className="font-medium">Email:</span> {email}
                </p>
                <p>
                  <span className="font-medium">Phone:</span> {phone}
                </p>
                <p>
                  <span className="font-medium">Age:</span> {age}
                </p>
                {salaryExpectation && (
                  <p>
                    <span className="font-medium">Salary Expectation:</span>{" "}
                    {salaryExpectation}
                  </p>
                )}
                <p>
                  <span className="font-medium">Required docs:</span>{" "}
                  {REQUIRED_DOCS.filter((d) => files[d.key]).length} /{" "}
                  {REQUIRED_DOCS.length}
                </p>
                <p>
                  <span className="font-medium">Education docs:</span>{" "}
                  {EDUCATION_DOCS.filter((d) => files[d.key]).length} uploaded
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => submitMutation.mutate()}
                  disabled={!canSubmit || submitMutation.isPending}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {submitMutation.isPending
                    ? "Submitting..."
                    : "Submit Application"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
