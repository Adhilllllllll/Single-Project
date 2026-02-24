import { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { loginUser } from "../features/auth/authSlice";
import { useNavigate } from "react-router-dom";
import ChangePasswordModal from "../components/ChangePasswordModal";
import ForgotPasswordModal from "../components/ForgotPasswordModal";
import { APP_NAME, APP_TAGLINE } from "../constants/appConfig";

// Role to dashboard path mapping
const ROLE_DASHBOARD_PATHS = {
  admin: "/admin/dashboard",
  reviewer: "/reviewer/dashboard",
  student: "/student/dashboard",
  advisor: "/advisor/dashboard",
};

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [pendingUser, setPendingUser] = useState(null);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { isAuthenticated, user, loading, error } = useSelector((state) => state.auth);

  // Memoized navigation function
  const navigateToDashboard = useCallback((role) => {
    const path = ROLE_DASHBOARD_PATHS[role] || "/";
    navigate(path, { replace: true });
  }, [navigate]);

  useEffect(() => {
    if (isAuthenticated && user) {
      navigateToDashboard(user.role);
    }
  }, [isAuthenticated, user, navigateToDashboard]);

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(loginUser({ email, password }))
      .unwrap()
      .then((payload) => {
        if (payload.mustChangePassword) {
          setPendingUser(payload);
          setShowChangePassword(true);
        } else {
          const role = payload?.user?.role;
          navigateToDashboard(role);
        }
      })
      .catch((err) => {
        console.error("Login failed:", err);
      });
  };

  const handlePasswordChanged = () => {
    setShowChangePassword(false);
    setEmail("");
    setPassword("");
    setPendingUser(null);
    alert("Password changed successfully! Please login with your new password.");
  };

  return (
    <>
      <ChangePasswordModal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
        userEmail={email}
        onSuccess={handlePasswordChanged}
      />
      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
      />

      {/* Main Container */}
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-100">
        {/* Login Card Container */}
        <div
          className="w-full max-w-[950px] grid grid-cols-1 lg:grid-cols-2 bg-white rounded-2xl overflow-hidden"
          style={{
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.08)',
            minHeight: '580px'
          }}
        >
          {/* LEFT PANEL - Branding */}
          <div
            className="hidden lg:flex flex-col justify-between p-10 relative overflow-hidden"
            style={{
              background: 'linear-gradient(145deg, #0f766e 0%, #115e59 50%, #134e4a 100%)'
            }}
          >
            {/* Decorative circles */}
            <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/5" />
            <div className="absolute top-1/3 -right-16 w-48 h-48 rounded-full bg-white/5" />
            <div className="absolute -bottom-20 -left-20 w-56 h-56 rounded-full bg-white/5" />
            <div className="absolute bottom-1/4 left-1/4 w-32 h-32 rounded-full bg-white/5" />

            {/* Top Section - Logo */}
            <div className="relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l9-5-9-5-9 5 9 5z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                  </svg>
                </div>
                <span className="text-xl font-semibold text-white">{APP_NAME}</span>
              </div>
            </div>

            {/* Middle Section - Heading */}
            <div className="relative z-10 -mt-8">
              <h2 className="text-[32px] font-bold text-white leading-tight mb-4">
                {APP_TAGLINE}
              </h2>
              <p className="text-white/75 text-base leading-relaxed max-w-xs">
                Empowering educators and students through seamless collaboration and academic progress tracking.
              </p>
            </div>

            {/* Bottom Section - Quote */}
            <div className="relative z-10">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/10">
                <p className="text-white/90 text-sm leading-relaxed italic">
                  "EduNexus brings clarity and structure to academic collaboration and progress tracking."
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL - Login Form */}
          <div className="flex flex-col justify-center p-8 lg:p-12">
            {/* Mobile Logo */}
            <div className="lg:hidden flex items-center justify-center gap-2 mb-8">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-teal-700">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                </svg>
              </div>
              <span className="text-xl font-semibold text-slate-800">{APP_NAME}</span>
            </div>

            {/* Header */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-slate-900 mb-1">
                Welcome Back
              </h1>
              <p className="text-slate-500">
                Sign in to your account
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Field */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <input
                    id="email"
                    type="email"
                    placeholder="name@institution.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 text-slate-800 text-sm placeholder-slate-400 bg-slate-50 focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-600/10 outline-none transition-all duration-200"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-3 rounded-xl border border-slate-200 text-slate-800 text-sm placeholder-slate-400 bg-slate-50 focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-600/10 outline-none transition-all duration-200"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span className="ml-2 text-sm text-slate-600">Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm font-medium text-teal-700 hover:text-teal-800 hover:underline transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-100">
                  <p className="text-sm text-center text-red-600">
                    {typeof error === "string" ? error : "An error occurred"}
                  </p>
                </div>
              )}

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-medium bg-teal-700 hover:bg-teal-800 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;
