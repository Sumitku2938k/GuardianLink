import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Mail,
  Lock,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  UserCheck,
} from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function Login() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSubmitted, setForgotSubmitted] = useState(false);

  const validate = () => {
    const newErrors = {};
    if (!identifier.trim()) {
      newErrors.identifier = "Please enter your email address or phone number";
    } else if (
      identifier.includes("@") &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)
    ) {
      newErrors.identifier = "Please enter a valid email address";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    // Simulate authentication delay
    setTimeout(() => {
      setIsLoading(false);
      navigate("/dashboard");
    }, 1200);
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    if (!forgotEmail || !forgotEmail.includes("@")) return;
    setForgotSubmitted(true);
    setTimeout(() => {
      setForgotSubmitted(false);
      setForgotPasswordOpen(false);
      setForgotEmail("");
    }, 2000);
  };

  return (
    <div className="w-full min-h-screen bg-background flex flex-col justify-between selection:bg-primary selection:text-white">
      {/* Top Simple Header */}
      <header className="px-6 py-5 flex items-center justify-between z-10">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 bg-gradient-to-br from-primary via-blue-600 to-teal-400 rounded-xl flex items-center justify-center shadow-md shadow-primary/20 group-hover:scale-105 transition-transform">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
              GuardianLink
            </span>
            <span className="text-[10px] block font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-widest">
              AI Child Protection
            </span>
          </div>
        </Link>

        <Link
          to="/register"
          className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
        >
          <span>Need an account?</span>
          <span className="font-bold">Register</span>
        </Link>
      </header>

      {/* Main Split Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center w-full">
          {/* Left Side (Desktop Illustration & Branding Showcase) */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="hidden lg:flex lg:col-span-6 flex-col justify-between space-y-8 pr-4"
          >
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-6">
                <Sparkles className="w-4 h-4 text-teal-500" />
                <span>Next-Gen Child Safety Ecosystem</span>
              </div>

              <h1 className="text-4xl xl:text-5xl font-black text-gray-900 dark:text-white tracking-tight leading-tight">
                Protecting Every Child with{" "}
                <span className="gradient-text">AI Neural Intelligence</span>
              </h1>

              <p className="mt-4 text-base text-gray-600 dark:text-gray-300 leading-relaxed max-w-lg">
                Log in to access your parent dashboard, view continuous biometric check-ins, manage safe zones, and connect to nationwide rapid alert networks.
              </p>
            </div>

            {/* Illustration Visual Card */}
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 via-primary/95 to-slate-900 p-8 text-white border border-slate-800 shadow-2xl">
              <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl" />

              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center">
                    <Shield className="w-7 h-7 text-teal-300" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Real-Time Protection</h3>
                    <p className="text-xs text-slate-300">Active CCTV & Biometric Matrix</p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold bg-teal-500/20 text-teal-300 px-3 py-1 rounded-full border border-teal-500/30">
                  99.8% Accuracy
                </span>
              </div>

              {/* Feature Points */}
              <div className="space-y-3 pt-2">
                {[
                  "Continuous facial vector indexing & location monitoring",
                  "Instant alert broadcast to nearby citizen & police network",
                  "Encrypted family biometric vault & medical record privacy",
                ].map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-xs text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Right Side (Login Form Card) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-6 flex justify-center"
          >
            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-gray-100 dark:border-slate-800 relative">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Welcome Back!
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Log in to manage your family safety portal
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleLogin} className="space-y-4">
                <Input
                  label="Phone Number or Email Address"
                  placeholder="e.g. parent@guardianlink.com or +91 9876543210"
                  icon={Mail}
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    if (errors.identifier) setErrors({ ...errors, identifier: null });
                  }}
                  error={errors.identifier}
                  required
                />

                <Input
                  label="Password"
                  type="password"
                  placeholder="••••••••••••"
                  icon={Lock}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors({ ...errors, password: null });
                  }}
                  error={errors.password}
                  required
                />

                {/* Options: Remember Me & Forgot Password */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary accent-primary"
                    />
                    <span className="font-medium">Remember Me</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => setForgotPasswordOpen(true)}
                    className="font-semibold text-primary hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>

                {/* Main Login Button */}
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full mt-2"
                  isLoading={isLoading}
                  rightIcon={ArrowRight}
                >
                  Log In to Dashboard
                </Button>

                {/* Social Login Divider */}
                <div className="relative my-6 flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200 dark:border-slate-800" />
                  </div>
                  <span className="relative px-3 bg-white dark:bg-slate-900 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    Or continue with
                  </span>
                </div>

                {/* Google Login Button */}
                <button
                  type="button"
                  onClick={() => navigate("/dashboard")}
                  className="w-full py-3 px-4 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700/80 font-semibold text-sm flex items-center justify-center gap-3 transition-colors shadow-sm"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.39 7.34 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.15 0 9.99 0 12s.45 3.85 1.24 5.42l4.04-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.61 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>
              </form>

              {/* Bottom Register Link */}
              <div className="mt-8 text-center pt-4 border-t border-gray-100 dark:border-slate-800">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Don't have an account yet?{" "}
                  <Link
                    to="/register"
                    className="font-bold text-primary hover:underline ml-1"
                  >
                    Register Now
                  </Link>
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Forgot Password Modal */}
      {forgotPasswordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-gray-100 dark:border-slate-800 text-left">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
              Reset Password
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Enter your registered email address to receive a password reset link.
            </p>

            {forgotSubmitted ? (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-2xl text-xs font-semibold text-center">
                ✓ Reset link sent to {forgotEmail}! Check your inbox.
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="parent@example.com"
                  icon={Mail}
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setForgotPasswordOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" size="sm">
                    Send Reset Link
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Simple Footer */}
      <footer className="py-4 text-center text-xs text-gray-400 border-t border-gray-100 dark:border-slate-800">
        © 2026 GuardianLink AI Platform. All rights reserved. Child Safety Protocol Compliant.
      </footer>
    </div>
  );
}
