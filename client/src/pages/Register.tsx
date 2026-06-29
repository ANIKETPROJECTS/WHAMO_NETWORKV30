import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";

export default function Register() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { register } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const validate = () => {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = "Full name is required";
    if (!email.trim()) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = "Enter a valid email";
    if (!password) e.password = "Password is required";
    else if (password.length < 8) e.password = "Password must be at least 8 characters";
    if (!confirm) e.confirm = "Please confirm your password";
    else if (password !== confirm) e.confirm = "Passwords do not match";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    try {
      await register(fullName.trim(), email.trim(), password);
      toast({ variant: "success", title: "Account Created", description: "You can now sign in with your credentials." });
      setLocation("/login");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Registration Failed", description: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const field = (
    id: string,
    label: string,
    value: string,
    onChange: (v: string) => void,
    type = "text",
    placeholder = "",
    extra?: React.ReactNode
  ) => (
    <div key={id}>
      <label className="block text-sm font-semibold text-slate-700 mb-1.5" style={{ fontFamily: "Poppins, sans-serif" }}>
        {label}
      </label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => { onChange(e.target.value); setErrors(p => { const n = { ...p }; delete n[id]; return n; }); }}
          placeholder={placeholder}
          data-testid={`input-${id}`}
          className={`w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition-colors ${errors[id] ? "border-red-400 bg-red-50" : "border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"} ${extra ? "pr-10" : ""}`}
          style={{ fontFamily: "Poppins, sans-serif" }}
        />
        {extra}
      </div>
      {errors[id] && <p className="mt-1 text-xs text-red-500" style={{ fontFamily: "Poppins, sans-serif" }}>{errors[id]}</p>}
    </div>
  );

  const eyeBtn = (show: boolean, toggle: () => void) => (
    <button type="button" onClick={toggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
      {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-[420px]">

        {/* Logo */}
        <div className="text-center mb-4">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight" style={{ fontFamily: "Poppins, sans-serif" }}>
            WHAMO <span className="text-blue-600">Designer</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1" style={{ fontFamily: "Poppins, sans-serif" }}>
            Hydraulic Network Analysis
          </p>
        </div>

        {/* Register Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
          <h2 className="text-xl font-bold text-slate-800 mb-6" style={{ fontFamily: "Poppins, sans-serif" }}>
            Create an account
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {field("fullName", "Full Name", fullName, setFullName, "text", "John Doe")}
            {field("email", "Email", email, setEmail, "email", "you@example.com")}
            {field("password", "Password", password, setPassword, showPass ? "text" : "password", "Min. 8 characters", eyeBtn(showPass, () => setShowPass(!showPass)))}
            {field("confirm", "Confirm Password", confirm, setConfirm, showConfirm ? "text" : "password", "Re-enter password", eyeBtn(showConfirm, () => setShowConfirm(!showConfirm)))}

            <button
              type="submit"
              disabled={isLoading}
              data-testid="button-register"
              className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors shadow-sm mt-2"
              style={{ fontFamily: "Poppins, sans-serif" }}
            >
              {isLoading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          {/* Login link */}
          <p className="text-center text-sm text-slate-500 mt-5" style={{ fontFamily: "Poppins, sans-serif" }}>
            Already have an account?{" "}
            <button
              onClick={() => setLocation("/login")}
              className="text-blue-600 font-semibold hover:underline"
              data-testid="link-login"
            >
              Sign in
            </button>
          </p>
        </div>

      </div>
    </div>
  );
}
