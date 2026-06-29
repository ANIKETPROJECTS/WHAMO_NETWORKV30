import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Copy, Check, Loader2 } from "lucide-react";
import jalShaktiLogo from "@assets/Ministry_of_Jal_Shakti.svg";
import cwcLogo from "@assets/Cwclogo.jpg";

const DEMO_EMAIL = "demo@example.com";
const DEMO_PASS = "Demo@123";

function LogoPlaceholder({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center h-20 w-full">
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest border border-dashed border-slate-300 rounded-lg px-4 py-2">
        {label}
      </span>
    </div>
  );
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);

  const { login, user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (user) setLocation("/designer");
  }, [user, setLocation]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!email.trim()) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = "Enter a valid email";
    if (!password) e.password = "Password is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Login Failed", description: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string, type: "email" | "pass") => {
    await navigator.clipboard.writeText(text);
    if (type === "email") { setCopiedEmail(true); setTimeout(() => setCopiedEmail(false), 2000); }
    else { setCopiedPass(true); setTimeout(() => setCopiedPass(false), 2000); }
  };

  const fillDemo = () => { setEmail(DEMO_EMAIL); setPassword(DEMO_PASS); setErrors({}); };

  const lineInput = "w-full bg-transparent border-0 border-b-2 border-slate-300 focus:border-blue-500 outline-none text-sm text-slate-800 py-2 placeholder-slate-400 transition-colors";

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">

      {/* ── Header: 4 logo slots ── */}
      <header className="w-full bg-white border-b border-slate-200 py-3 px-6 shrink-0 z-50">
        <div className="flex items-center divide-x divide-slate-200 w-full">

          {/* Logo 1 — Ministry of Jal Shakti */}
          <div className="flex-1 flex items-center justify-center px-4">
            <img src={jalShaktiLogo} alt="Ministry of Jal Shakti" className="h-16 w-auto object-contain" />
          </div>

          {/* Logo 2 — CWC */}
          <div className="flex-1 flex items-center justify-center px-4">
            <img src={cwcLogo} alt="Central Water Commission" className="h-16 w-auto object-contain" />
          </div>

          {/* Logo 3 — placeholder */}
          <div className="flex-1 flex items-center justify-center px-4">
            <LogoPlaceholder label="Logo 3" />
          </div>

          {/* Logo 4 — placeholder */}
          <div className="flex-1 flex items-center justify-center px-4">
            <LogoPlaceholder label="Logo 4" />
          </div>

        </div>
      </header>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col lg:flex-row-reverse overflow-hidden">

        {/* ── RIGHT: Form Panel ── */}
        <div className="flex-1 flex flex-col items-center justify-start pt-6 px-8 pb-4 bg-white lg:border-l lg:border-slate-200 overflow-y-auto relative">

          {/* Top-right badge */}
          <div className="absolute top-4 right-4 flex flex-col items-end text-right">
            <div className="h-12 w-20 border border-dashed border-slate-300 rounded-lg flex items-center justify-center mb-1">
              <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-widest">Badge</span>
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-tight">Version 1.0</span>
          </div>

          <div className="w-full max-w-md">
            {/* App logo placeholder */}
            <div className="flex flex-col items-center justify-center mb-8">
              <div className="h-28 w-64 bg-slate-50 border border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center mb-2">
                <span className="text-2xl font-extrabold text-slate-800 tracking-tight" style={{ fontFamily: "Poppins, sans-serif" }}>
                  WHAMO <span className="text-blue-600">Designer</span>
                </span>
                <span className="text-xs text-slate-400 mt-1">App Logo Placeholder</span>
              </div>
            </div>

            {/* Login form */}
            <form onSubmit={handleLogin} className="space-y-8" noValidate>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setErrors(p => ({ ...p, email: "" })); }}
                  placeholder="you@example.com"
                  data-testid="input-email"
                  className={lineInput + (errors.email ? " border-red-400" : "")}
                  autoComplete="email"
                />
                {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setErrors(p => ({ ...p, password: "" })); }}
                    placeholder="••••••••"
                    data-testid="input-password"
                    className={lineInput + " pr-8" + (errors.password ? " border-red-400" : "")}
                    autoComplete="current-password"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
              </div>

              {/* Sign In button */}
              <button
                type="submit"
                disabled={isLoading}
                data-testid="button-signin"
                className="w-full py-2.5 h-11 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
              >
                {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</> : "Sign In"}
              </button>
            </form>

            {/* Demo account */}
            <div className="mt-6 bg-slate-50 rounded-xl border border-blue-100 p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">Demo Account</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">For demonstration and testing only</p>
                </div>
                <button onClick={fillDemo} data-testid="button-fill-demo" className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-white border border-blue-200 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">
                  Use Demo
                </button>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-slate-200">
                  <div>
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Email</p>
                    <p className="text-sm text-slate-700 font-mono mt-0.5">{DEMO_EMAIL}</p>
                  </div>
                  <button onClick={() => copyToClipboard(DEMO_EMAIL, "email")} data-testid="button-copy-email" className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 transition-colors">
                    {copiedEmail ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-slate-200">
                  <div>
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Password</p>
                    <p className="text-sm text-slate-700 font-mono mt-0.5">{DEMO_PASS}</p>
                  </div>
                  <button onClick={() => copyToClipboard(DEMO_PASS, "pass")} data-testid="button-copy-password" className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 transition-colors">
                    {copiedPass ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ── LEFT: Info Panel (desktop only) ── */}
        <div className="hidden lg:flex flex-1 items-center justify-center p-12 bg-white">
          <div className="max-w-2xl text-slate-900 w-full">
            <div className="flex flex-col items-center text-center mb-12">

              <div className="h-32 w-48 bg-slate-50 border border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center mb-12">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Org Logo</span>
              </div>

              <div className="space-y-6 w-full">
                <div className="p-8 bg-slate-50 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="grid grid-cols-1 gap-6 text-left">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                      <span className="text-slate-500 font-medium uppercase tracking-wider text-xs">Software</span>
                      <span className="text-2xl font-bold text-slate-900">WHAMO Designer</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                      <span className="text-slate-500 font-medium uppercase tracking-wider text-xs">Version</span>
                      <span className="text-2xl font-bold text-slate-900">1.0</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                      <span className="text-slate-500 font-medium uppercase tracking-wider text-xs">Engine</span>
                      <span className="text-2xl font-bold text-slate-900">WHAMO</span>
                    </div>
                    <div className="pt-2">
                      <span className="text-slate-500 font-medium uppercase tracking-wider text-xs block mb-3">About</span>
                      <p className="text-xl font-semibold leading-relaxed text-slate-900">
                        Visual network designer for hydraulic transient (water hammer) analysis using the WHAMO simulation engine
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ── Footer ── */}
      <footer className="w-full py-2 text-center border-t border-slate-100 bg-white shrink-0 z-50">
        <div className="flex items-center justify-center space-x-2 text-xs text-slate-500 px-4">
          <span className="font-medium whitespace-nowrap">WHAMO Designer</span>
          <span className="font-bold">|</span>
          <span className="whitespace-nowrap">Hydraulic Transient Analysis Tool</span>
          <span className="font-bold">|</span>
          <span className="whitespace-nowrap">Water Hammer &amp; Mass Oscillation</span>
        </div>
      </footer>

    </div>
  );
}
