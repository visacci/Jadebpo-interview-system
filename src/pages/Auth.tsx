import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { LogIn, UserPlus } from "lucide-react";

const SECRET_CODE = "1408";

export default function Auth() {
  const navigate = useNavigate();
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [secretCode, setSecretCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Welcome back!");
      navigate("/dashboard");
    }
  };

  const handleSignup = async () => {
    if (secretCode !== SECRET_CODE) {
      toast.error("Invalid secret code. Please contact your administrator.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Account created! You can now log in.");
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 animate-slide-up">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <img
              src="/images/logo.png"
              alt="Jade BPO Logo"
              className="h-12 object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Jade BPO</h1>
          <p className="text-muted-foreground">Hiring Management System</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isSignup ? (
                <UserPlus className="h-5 w-5 text-primary" />
              ) : (
                <LogIn className="h-5 w-5 text-primary" />
              )}
              {isSignup ? "Create Account" : "Sign In"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isSignup && (
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input
                  placeholder="Your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="hr@jadebpo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {isSignup && (
              <div className="space-y-2">
                <Label>Secret Code</Label>
                <Input
                  type="password"
                  placeholder="Enter secret code"
                  value={secretCode}
                  onChange={(e) => setSecretCode(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Contact your administrator for the secret code
                </p>
              </div>
            )}
            <Button
              className="w-full"
              onClick={isSignup ? handleSignup : handleLogin}
              disabled={
                loading || !email || !password || (isSignup && !fullName)
              }
            >
              {loading
                ? "Please wait..."
                : isSignup
                  ? "Create Account"
                  : "Sign In"}
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setIsSignup(!isSignup)}
            >
              {isSignup
                ? "Already have an account? Sign in"
                : "Need an account? Sign up"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
