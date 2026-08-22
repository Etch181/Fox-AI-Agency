import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import { IndustryType, PlanId } from "../../types";
import { PricingPlans } from "../PricingPlans";
import { AgencySalesBotWidget } from "./AgencySalesBotWidget";
import {
  Bot,
  Building2,
  Mail,
  Lock,
  User,
  Phone,
  Key,
  PlusCircle,
  ArrowRight,
  Sparkles,
  Check,
  Eye,
  EyeOff,
  Globe,
  Zap,
  MessageSquare,
  Shield,
  CreditCard,
  Layers,
  Clock,
  TrendingUp,
  Send,
  CheckCircle2,
  Star,
  Receipt,
  Stethoscope,
  Pill,
  Utensils,
  ShoppingBag,
  Workflow,
  ShieldCheck,
  ChevronRight,
  LogIn,
  LayoutDashboard,
  BarChart3,
  Cpu,
  QrCode,
  Terminal,
  Users,
  Smartphone,
  Search,
  Activity,
  Sliders,
  Laptop,
  Radio,
  CheckCircle,
} from "lucide-react";

interface PublicLandingPageProps {
  onLoginClick?: () => void;
}

export const PublicLandingPage: React.FC<PublicLandingPageProps> = ({ onLoginClick }) => {
  const { plans, registerWorkspace, loginWithEmail, language, setLanguage } = useApp();
  const isAr = language === "ar";

  const [activeTab, setActiveTab] = useState<"landing" | "login" | "register">("login");
  const [selectedPlanForReg, setSelectedPlanForReg] = useState<PlanId>("starter");

  // Active Screen Mockup Tab for Showcase Section
  const [activeScreenTab, setActiveScreenTab] = useState<"inbox" | "n8n" | "analytics" | "telegram" | "clients">("inbox");

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Registration form state
  const [wsName, setWsName] = useState("");
  const [industry, setIndustry] = useState<IndustryType>("Clinic");
  const [ownerName, setOwnerName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [activationCode, setActivationCode] = useState("");

  // FOX PRODUCTION REGISTRATION V1
  const [regPassword, setRegPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [registering, setRegistering] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) return;
    await loginWithEmail(loginEmail, loginPassword);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !wsName ||
      !ownerName ||
      !regEmail ||
      !regPassword
    ) {
      return;
    }

    setRegistering(true);

    try {
      await registerWorkspace(
        wsName,
        industry,
        ownerName,
        regEmail,
        phone,
        activationCode,
        regPassword
      );
    } finally {
      setRegistering(false);
    }
  };

  const scrollToRegistration = (planId?: PlanId) => {
    if (planId) {
      setSelectedPlanForReg(planId);
    }
    setActiveTab("register");
    const regSection = document.getElementById("register-form-section");
    if (regSection) {
      regSection.scrollIntoView({ behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div
      className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans ${
        isAr ? "dir-rtl" : "dir-ltr"
      }`}
    >
      {/* Background Decorative Shapes */}
      <div className="absolute top-0 ltr:-right-40 rtl:-left-40 w-[40rem] h-[40rem] rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 ltr:-left-40 rtl:-right-40 w-[30rem] h-[30rem] rounded-full bg-orange-500/10 blur-[120px] pointer-events-none" />

      {/* Navigation Bar */}
      <header className="sticky top-0 z-40 flex h-20 w-full items-center justify-between border-b border-slate-800/80 bg-slate-950/80 px-6 backdrop-blur-xl md:px-12 shadow-sm">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab("landing")}>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-orange-600 to-orange-500 text-white shadow-lg shadow-orange-500/30">
            <Bot className="h-6 w-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black tracking-tight text-white text-xl">
                FOX AI <span className="text-orange-500">AGENCY</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
              {isAr
                ? "منصة خدمة العملاء الذكية في مصر"
                : "Smart Customer Service Platform"}
            </p>
          </div>
        </div>

        {/* Navigation Items & Actions */}
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={() => setLanguage(isAr ? "en" : "ar")}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-bold text-slate-300 hover:border-orange-500 hover:text-orange-400 transition shadow-sm"
          >
            <Globe className="h-4 w-4 text-orange-500" />
            <span>{isAr ? "English" : "العربية"}</span>
          </button>

          <button
            onClick={() => setActiveTab("login")}
            className={`hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === "login"
                ? "bg-slate-800 text-orange-400 border border-slate-700"
                : "text-slate-400 hover:text-orange-400 hover:bg-slate-800"
            }`}
          >
            <LogIn className="h-4 w-4 text-orange-500" />
            <span>{isAr ? "تسجيل الدخول" : "Sign In"}</span>
          </button>

          <button
            onClick={() => scrollToRegistration()}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-orange-500/20 hover:from-orange-600 hover:to-orange-700 transition"
          >
            <PlusCircle className="h-4 w-4" />
            <span>{isAr ? "ابدأ مجاناً" : "Start Free"}</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-16 z-10">
        
        {/* HERO SECTION */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center pt-4 sm:pt-8">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-extrabold uppercase tracking-wider shadow-sm">
              <Sparkles className="h-4 w-4 text-orange-400 animate-pulse" />
              <span>
                {isAr
                  ? "المستقبل هنا: وكيل ذكي لمشروعك"
                  : "The Future: Smart Agent for Your Business"}
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white leading-[1.15] tracking-tight">
              {isAr ? (
                <>
                  أتمتة خدمة عملائك بذكاء مع <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">منصة فوكس</span>
                </>
              ) : (
                <>
                  Automate Customer Service with <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">Fox Platform</span>
                </>
              )}
            </h1>

            <p className="text-sm sm:text-base text-slate-400 font-medium leading-relaxed max-w-2xl">
              {isAr
                ? "اربط قنواتك، درب وكيلك الذكي، واستقبل الرسائل من كافة المنصات في صندوق وارد موحد. خدمة عملاء 24/7 لمبيعات أكثر."
                : "Connect your channels, train your AI agent, and receive messages from all platforms in a unified inbox. 24/7 customer service for more sales."}
            </p>

            {/* Feature Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-200">{isAr ? "صندوق موحد" : "Unified Inbox"}</p>
                  <p className="text-[10px] text-slate-500">{isAr ? "كل المحادثات هنا" : "All chats in one place"}</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
                <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400">
                  <Bot className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-200">{isAr ? "رد آلي ذكي" : "Smart Auto-reply"}</p>
                  <p className="text-[10px] text-slate-500">{isAr ? "مدعوم بـ AI" : "Powered by AI"}</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm col-span-2 sm:col-span-1">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                  <Workflow className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-200">{isAr ? "ربط مرن" : "Flexible Integrations"}</p>
                  <p className="text-[10px] text-slate-500">{isAr ? "واتساب والمزيد" : "WhatsApp & more"}</p>
                </div>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-4">
              <button
                onClick={() => scrollToRegistration()}
                className="flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black text-sm shadow-xl shadow-orange-600/20 transition transform hover:-translate-y-0.5"
              >
                <span>{isAr ? "إنشاء حساب وبدء التجربة المجانية" : "Create Account & Start Free Trial"}</span>
                <ArrowRight className={`h-4 w-4 ${isAr ? "rotate-180" : ""}`} />
              </button>
            </div>
          </div>

          {/* Right Hero Interactive Widget (Login / Register Card) */}
          <div id="register-form-section" className="lg:col-span-5">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative">
              {/* Card Header Switcher */}
              <div className="flex rounded-2xl bg-slate-950 p-1 mb-6 border border-slate-800">
                <button
                  onClick={() => setActiveTab("register")}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 ${
                    activeTab === "register" || activeTab === "landing"
                      ? "bg-orange-500 text-white shadow-md"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>{isAr ? "تسجيل نشاط تجاري جديد" : "Register Business"}</span>
                </button>
                <button
                  onClick={() => setActiveTab("login")}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 ${
                    activeTab === "login"
                      ? "bg-orange-500 text-white shadow-md"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <LogIn className="h-4 w-4" />
                  <span>{isAr ? "تسجيل الدخول" : "Sign In"}</span>
                </button>
              </div>

              {/* REGISTER FORM */}
              {(activeTab === "register" || activeTab === "landing") && (
                <form onSubmit={handleRegisterSubmit} className="space-y-4">
                  <div>
                    <h3 className="text-lg font-black text-white">
                      {isAr ? "تسجيل مشترك جديد" : "New Subscriber Registration"}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      {isAr
                        ? "أنشئ مساحة عملك واحصل على التجربة المجانية فوراً"
                        : "Setup your business workspace and start managing customers"}
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">
                      {isAr ? "اسم الشركة / العيادة / النشاط" : "Business / Company Name"}
                    </label>
                    <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 focus-within:border-orange-500">
                      <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
                      <input
                        type="text"
                        placeholder={isAr ? "مثال: مركز الحياة الطبي" : "e.g. Al-Hayat Medical Center"}
                        value={wsName}
                        onChange={(e) => setWsName(e.target.value)}
                        className="w-full text-xs font-semibold bg-transparent text-white focus:outline-none placeholder-slate-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">
                        {isAr ? "قطاع النشاط" : "Industry"}
                      </label>
                      <select
                        value={industry}
                        onChange={(e) => setIndustry(e.target.value as IndustryType)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-xs font-semibold text-white focus:outline-none focus:border-orange-500"
                      >
                        <option value="Clinic">{isAr ? "عيادة طبية" : "Medical Clinic"}</option>
                        <option value="Pharmacy">{isAr ? "صيدلية" : "Pharmacy"}</option>
                        <option value="Restaurant">{isAr ? "مطعم / كافيه" : "Restaurant / Cafe"}</option>
                        <option value="Retail">{isAr ? "متجر تجاري" : "Retail Store"}</option>
                        <option value="Small Business">{isAr ? "نشاط تجاري" : "Small Business"}</option>
                  <option value="Course Center">{isAr ? "مركز تدريب / كورسات" : "Course Center"}</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">
                        {isAr ? "اسم صاحب الحساب" : "Owner Name"}
                      </label>
                      <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 focus-within:border-orange-500">
                        <User className="h-4 w-4 text-slate-400 shrink-0" />
                        <input
                          type="text"
                          placeholder={isAr ? "د. سامح نادر" : "Dr. Sameh Nader"}
                          value={ownerName}
                          onChange={(e) => setOwnerName(e.target.value)}
                          className="w-full text-xs font-semibold bg-transparent text-white focus:outline-none placeholder-slate-500"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">
                        {isAr ? "البريد الإلكتروني" : "Email"}
                      </label>
                      <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 focus-within:border-orange-500">
                        <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                        <input
                          type="email"
                          placeholder="owner@business.com"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          className="w-full text-xs font-semibold bg-transparent text-white focus:outline-none placeholder-slate-500"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">
                        {isAr ? "الهاتف (واتساب)" : "WhatsApp Phone"}
                      </label>
                      <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 focus-within:border-orange-500">
                        <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                        <input
                          type="tel"
                          placeholder="+2010..."
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full text-xs font-semibold bg-transparent text-white focus:outline-none placeholder-slate-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* FOX PRODUCTION REGISTRATION V1 */}
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">
                      {isAr ? "كلمة المرور" : "Password"}
                    </label>

                    <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 focus-within:border-orange-500">
                      <Lock className="h-4 w-4 text-slate-400 shrink-0" />

                      <input
                        type={showRegPassword ? "text" : "password"}
                        placeholder={
                          isAr
                            ? "8 أحرف على الأقل + حروف وأرقام"
                            : "8+ characters with letters and numbers"
                        }
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        minLength={8}
                        autoComplete="new-password"
                        className="w-full text-xs font-semibold bg-transparent text-white focus:outline-none placeholder-slate-500"
                        required
                      />

                      <button
                        type="button"
                        onClick={() => setShowRegPassword((v) => !v)}
                        className="text-[10px] font-bold text-slate-400 hover:text-orange-400"
                      >
                        {showRegPassword
                          ? isAr
                            ? "إخفاء"
                            : "Hide"
                          : isAr
                          ? "إظهار"
                          : "Show"}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">
                      {isAr ? "كود التفعيل (اختياري)" : "Activation Code (Optional)"}
                    </label>
                    <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 focus-within:border-orange-500">
                      <Key className="h-4 w-4 text-orange-400 shrink-0" />
                      <input
                        type="text"
                        placeholder="e.g. FOX-BUS-1092-M"
                        value={activationCode}
                        onChange={(e) => setActivationCode(e.target.value)}
                        className="w-full text-xs font-mono font-bold bg-transparent text-orange-400 focus:outline-none placeholder-slate-500 uppercase"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={registering}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-black text-xs shadow-lg shadow-orange-500/20 transition flex items-center justify-center gap-2"
                  >
                    <span>
                      {registering
                        ? isAr
                          ? "جاري إنشاء الحساب..."
                          : "Creating account..."
                        : isAr
                        ? "تأكيد التسجيل وبدء الاستخدام"
                        : "Register Business & Get Started"}
                    </span>
                    <ArrowRight className={`h-4 w-4 ${isAr ? "rotate-180" : ""}`} />
                  </button>

                  <p className="text-[10px] text-center text-slate-400 font-medium">
                    🔒 {isAr ? "عزل تشتيت البيانات ومضمون بأعلى درجات الأمان" : "Isolated multi-tenant data workspace security"}
                  </p>
                </form>
              )}

              {/* LOGIN FORM */}
              {activeTab === "login" && (
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div>
                    <h3 className="text-lg font-black text-white">
                      {isAr ? "تسجيل دخول مشترك" : "Subscriber Login"}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      {isAr ? "أدخل بيانات حسابك للوصول إلى لوحة التحكم" : "Sign in to access your dashboard"}
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">
                      {isAr ? "البريد الإلكتروني" : "Email Address"}
                    </label>
                    <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 focus-within:border-orange-500">
                      <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                      <input
                        type="email"
                        placeholder="user@business.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="w-full text-xs font-semibold bg-transparent text-white focus:outline-none placeholder-slate-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">
                      {isAr ? "كلمة المرور" : "Password"}
                    </label>
                    <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 focus-within:border-orange-500">
                      <Lock className="h-4 w-4 text-slate-400 shrink-0" />
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="w-full text-xs font-semibold bg-transparent text-white focus:outline-none placeholder-slate-500"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-slate-400 hover:text-white"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black text-xs shadow-lg shadow-orange-500/20 transition flex items-center justify-center gap-2"
                  >
                    <span>{isAr ? "تسجيل الدخول" : "Sign In"}</span>
                    <ArrowRight className={`h-4 w-4 ${isAr ? "rotate-180" : ""}`} />
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>

        {/* AGENCY PLATFORM INTERACTIVE SCREENSHOTS & UI SHOWCASE SECTION */}
        <section className="pt-6 pb-4 space-y-8">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-black uppercase tracking-wider shadow-sm">
              <Laptop className="h-3.5 w-3.5 text-orange-500" />
              <span>{isAr ? "معاينة واجهات المنصة والتطبيق" : "Agency App UI & Live Mockups"}</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              {isAr ? "شاشات وكالة Fox AI الذكية بين يديك" : "Interactive Showcase of Fox AI Platform Screens"}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 font-medium leading-relaxed max-w-2xl mx-auto">
              {isAr
                ? "تصفح الواجهات الحقيقية للوكالة، شاشات المحادثات الموحدة، محرك أتمتة n8n، ومراقبة استهلاك الذكاء الاصطناعي لحظياً."
                : "Explore real screens of the agency, unified inbox, n8n automation engine, and live Gemini AI usage monitoring."}
            </p>
          </div>

          {/* Screenshot Navigation Tabs */}
          <div className="flex items-center justify-center gap-2 flex-wrap max-w-4xl mx-auto p-1.5 rounded-2xl bg-slate-900 border border-slate-800/80 shadow-lg">
            <button
              type="button"
              onClick={() => setActiveScreenTab("inbox")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                activeScreenTab === "inbox"
                  ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md shadow-orange-500/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              <span>{isAr ? "صندوق المحادثات الموحد" : "Unified Inbox"}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveScreenTab("n8n")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                activeScreenTab === "n8n"
                  ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md shadow-orange-500/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <Workflow className="h-4 w-4" />
              <span>{isAr ? "سير العمل n8n" : "n8n Automations"}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveScreenTab("analytics")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                activeScreenTab === "analytics"
                  ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md shadow-orange-500/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <Activity className="h-4 w-4" />
              <span>{isAr ? "مراقبة Gemini AI" : "Gemini AI Monitor"}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveScreenTab("telegram")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                activeScreenTab === "telegram"
                  ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md shadow-orange-500/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <Radio className="h-4 w-4" />
              <span>{isAr ? "بوت تليجرام والواتساب" : "Telegram & WhatsApp"}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveScreenTab("clients")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                activeScreenTab === "clients"
                  ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md shadow-orange-500/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <Building2 className="h-4 w-4" />
              <span>{isAr ? "إدارة المنشآت والمستأجرين" : "Multi-Tenant Manager"}</span>
            </button>
          </div>

          {/* macOS App Frame UI Mockup Container */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/95 shadow-2xl overflow-hidden max-w-6xl mx-auto backdrop-blur-xl relative group">
            {/* Window Titlebar Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-800 bg-slate-950/90">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-rose-500/80" />
                <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
              </div>

              <div className="hidden sm:flex items-center gap-2 px-4 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-400">
                <Globe className="h-3.5 w-3.5 text-orange-500" />
                <span>
                  https://app.foxaiagency.com/{activeScreenTab === "inbox" ? "unified-inbox" : activeScreenTab === "n8n" ? "workflows-n8n" : activeScreenTab === "analytics" ? "gemini-monitoring" : activeScreenTab === "telegram" ? "telegram-bot" : "workspaces"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider">
                  LIVE • CONNECTED
                </span>
              </div>
            </div>

            {/* SCREEN CONTENT VIEWPORT */}
            <div className="p-4 sm:p-6 lg:p-8 min-h-[440px] bg-slate-950/60 font-sans">
              
              {/* TAB 1: UNIFIED INBOX SCREEN */}
              {activeScreenTab === "inbox" && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-orange-500" />
                        <h3 className="text-base font-black text-white">
                          {isAr ? "صندوق الوارد الموحد (WhatsApp, Instagram, Telegram)" : "Multi-Channel Unified Inbox"}
                        </h3>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {isAr ? "إدارة كل محادثات العملاء مع الرد الآلي الذكي بالذكاء الاصطناعي" : "Manage all customer chats with AI auto-replies"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold flex items-center gap-1.5">
                        <Bot className="h-3.5 w-3.5" />
                        {isAr ? "الوكيل الذكي مفعل (Auto-Pilot)" : "AI Agent Active"}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 min-h-[340px]">
                    {/* Chat Conversations List Sidebar */}
                    <div className="md:col-span-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-3 space-y-2">
                      <div className="flex items-center justify-between px-2 pb-2 border-b border-slate-800">
                        <span className="text-xs font-bold text-slate-300">{isAr ? "المحادثات الحالية" : "Active Chats"}</span>
                        <span className="text-[10px] bg-orange-500/20 text-orange-400 font-bold px-2 py-0.5 rounded-full">3 جديدة</span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/30 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">د. سارة الأحمدي</span>
                          <span className="text-[9px] text-orange-400 font-mono">الآن</span>
                        </div>
                        <p className="text-[11px] text-slate-300 truncate">أحتاج حجز كشف في عيادة الأسنان غداً</p>
                        <div className="flex items-center gap-1.5 pt-1">
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold">WhatsApp</span>
                          <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded">عيادة الشفاء</span>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-200">مطعم العمدة - طلب 402</span>
                          <span className="text-[9px] text-slate-500 font-mono">منذ 3د</span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">تم تأكيد طلب الدليفري عبر البوت</p>
                        <div className="flex items-center gap-1.5 pt-1">
                          <span className="text-[9px] bg-sky-500/20 text-sky-400 px-1.5 py-0.5 rounded font-bold">Telegram</span>
                          <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">تأكيد تلقائي</span>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1 opacity-75">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-300">م. محمود حسن</span>
                          <span className="text-[9px] text-slate-500 font-mono">منذ 12د</span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">ما هي أسعار الباقات والخصومات؟</p>
                        <div className="flex items-center gap-1.5 pt-1">
                          <span className="text-[9px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded font-bold">Instagram</span>
                        </div>
                      </div>
                    </div>

                    {/* Chat Active Thread Area */}
                    <div className="md:col-span-8 rounded-2xl border border-slate-800 bg-slate-900/90 p-4 flex flex-col justify-between space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold text-xs">
                            SA
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white">د. سارة الأحمدي (+20 100 889 4410)</p>
                            <p className="text-[10px] text-emerald-400">متصل الآن عبر واتساب العيادة</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-lg font-bold">
                            تحليل الشعور: إيجابي 😊
                          </span>
                        </div>
                      </div>

                      <div className="flex-1 py-2 space-y-3">
                        {/* Customer Bubble */}
                        <div className="flex justify-start">
                          <div className="max-w-[80%] rounded-2xl rounded-tl-none bg-slate-800 p-3 text-xs text-slate-200">
                            السلام عليكم، أحتاج حجز كشف أسنان في عيادة المهندسين غداً الساعة 6 مساءً؟
                          </div>
                        </div>

                        {/* AI Bot Response Bubble */}
                        <div className="flex justify-end">
                          <div className="max-w-[85%] rounded-2xl rounded-tr-none bg-gradient-to-r from-orange-600 to-orange-500 p-3 text-xs text-white shadow-md space-y-1.5">
                            <div className="flex items-center gap-1.5 text-[10px] text-orange-100 font-extrabold border-b border-orange-400/40 pb-1">
                              <Bot className="h-3.5 w-3.5" />
                              <span>{isAr ? "رد بوت عيادات الشفاء الذكي (Gemini 2.5 AI)" : "AI Assistant Auto-Reply"}</span>
                            </div>
                            <p>
                              وعليكم السلام يا دكتورة سارة! 🏥 تم مراجعة الجدول والميعاد متاح غداً الساعة 6:00 مساءً مع د. أحمد الشناوي.
                              تم تسجيل الحجز المبدئي وإرسال رابط التأكيد على الواتساب.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Reply Input Mockup */}
                      <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={isAr ? "اكتب ردك المباشر أو دع الذكاء الاصطناعي يجيب..." : "Type direct reply or let AI generate..."}
                          className="flex-1 rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-slate-400 focus:outline-none"
                        />
                        <button type="button" className="p-2 rounded-xl bg-orange-500 text-white font-bold text-xs flex items-center gap-1">
                          <Send className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: N8N WORKFLOWS AUTOMATION */}
              {activeScreenTab === "n8n" && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <Workflow className="h-5 w-5 text-orange-500" />
                        <h3 className="text-base font-black text-white">
                          {isAr ? "محرك الأتمتة والسير العمل السحابي n8n Workflows" : "n8n Cloud Visual Automation Flow"}
                        </h3>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {isAr ? "ربط أحداث الواتساب والتليجرام بـ Gemini AI وقواعد بيانات Firestore مباشرة" : "Connect triggers, Gemini AI parsing, and Firestore DB in real-time"}
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-bold">
                      Exec Time: 118ms ⚡
                    </span>
                  </div>

                  {/* Visual Node Pipeline Mockup */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 relative overflow-hidden">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                      
                      {/* Node 1 */}
                      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 relative shadow-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase">Trigger Node</span>
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        </div>
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                            <Smartphone className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white">WhatsApp / Telegram</p>
                            <p className="text-[10px] text-slate-400">Incoming Webhook</p>
                          </div>
                        </div>
                      </div>

                      {/* Node 2 */}
                      <div className="p-4 rounded-2xl bg-slate-950 border border-orange-500/40 bg-orange-500/5 space-y-2 relative shadow-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono text-orange-400 font-bold uppercase">AI Processing</span>
                          <Sparkles className="h-3.5 w-3.5 text-orange-400 animate-spin" />
                        </div>
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-xl bg-orange-500/20 text-orange-400">
                            <Cpu className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white">Gemini 2.5 Flash API</p>
                            <p className="text-[10px] text-orange-300">Intent & Context Extraction</p>
                          </div>
                        </div>
                      </div>

                      {/* Node 3 */}
                      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 relative shadow-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase">Data & Action</span>
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        </div>
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                            <ShieldCheck className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white">Firestore DB & CRM</p>
                            <p className="text-[10px] text-slate-400">Save Lead & Send Reply</p>
                          </div>
                        </div>
                      </div>

                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
                      <div className="flex items-center gap-2 font-mono">
                        <Terminal className="h-4 w-4 text-orange-500" />
                        <span>Payload: {"{ sender: '+2010...', intent: 'BOOKING_REQUEST', confidence: 0.98 }"}</span>
                      </div>
                      <span className="text-emerald-400 font-bold">Status: 200 OK • Success</span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: GEMINI AI MONITORING */}
              {activeScreenTab === "analytics" && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-orange-500" />
                        <h3 className="text-base font-black text-white">
                          {isAr ? "لوحة مراقبة استهلاك ذكاء Gemini AI والحصص" : "Gemini AI API & Quota Monitoring"}
                        </h3>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {isAr ? "متابعة التوكنات، السرعة، وتكاليف كل مشترك بالدقة المتناهية" : "Track tokens, latency speed, and tenant costs"}
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 text-xs font-bold">
                      Model: Gemini 2.5 Flash
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                      <p className="text-[11px] text-slate-400 font-medium">{isAr ? "إجمالي التوكنات المستهلكة" : "Total Tokens Consumed"}</p>
                      <p className="text-2xl font-black text-white font-mono">1,480,250</p>
                      <p className="text-[10px] text-emerald-400">↑ +14.2% {isAr ? "مقارنة بالأسبوع الماضي" : "vs last week"}</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                      <p className="text-[11px] text-slate-400 font-medium">{isAr ? "متوسط زمن الاستجابة" : "Avg Response Latency"}</p>
                      <p className="text-2xl font-black text-orange-400 font-mono">340 ms</p>
                      <p className="text-[10px] text-slate-400">{isAr ? "سرعة فائقة جداً" : "Ultra fast execution"}</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                      <p className="text-[11px] text-slate-400 font-medium">{isAr ? "نسبة نجاح الاستدعاءات" : "API Success Rate"}</p>
                      <p className="text-2xl font-black text-emerald-400 font-mono">99.98%</p>
                      <p className="text-[10px] text-emerald-400">0 {isAr ? "أخطاء في النواة" : "Core errors"}</p>
                    </div>
                  </div>

                  {/* Simulated Usage Graph Bar */}
                  <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                      <span>{isAr ? "توزيع استهلاك القطاعات للذكاء الاصطناعي" : "AI Usage Distribution by Industry"}</span>
                      <span className="font-mono text-orange-400">42,900 Calls</span>
                    </div>
                    <div className="h-4 rounded-full bg-slate-950 p-0.5 flex overflow-hidden border border-slate-800">
                      <div className="h-full bg-sky-500 rounded-l-full w-[40%]" title="Clinics 40%" />
                      <div className="h-full bg-emerald-500 w-[25%]" title="Pharmacies 25%" />
                      <div className="h-full bg-amber-500 w-[20%]" title="Restaurants 20%" />
                      <div className="h-full bg-purple-500 rounded-r-full w-[15%]" title="Retail 15%" />
                    </div>
                    <div className="flex items-center justify-between gap-2 text-[10px] text-slate-400 pt-1 flex-wrap">
                      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-sky-500" /> {isAr ? "العيادات 40%" : "Clinics 40%"}</span>
                      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> {isAr ? "الصيدليات 25%" : "Pharmacies 25%"}</span>
                      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> {isAr ? "المطاعم 20%" : "Restaurants 20%"}</span>
                      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-purple-500" /> {isAr ? "المتاجر 15%" : "Retail 15%"}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: TELEGRAM & WHATSAPP INTEGRATION */}
              {activeScreenTab === "telegram" && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <Radio className="h-5 w-5 text-orange-500" />
                        <h3 className="text-base font-black text-white">
                          {isAr ? "إدارة بوت تليجرام الرسمي وقنوات الواتساب" : "Official Telegram Bot & WhatsApp Channel Settings"}
                        </h3>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {isAr ? "تفعيل الـ Webhook، أوامر البوت المخصصة، والحملات التسويقية" : "Webhook config, custom bot commands, and automated messaging"}
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold">
                      Webhook: Active 🟢
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">{isAr ? "حالة ربط البوت الرسمي" : "Official Bot Status"}</span>
                        <span className="text-[10px] font-mono text-cyan-400">@FoxAgencyOfficialBot</span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
                        <div className="flex items-center justify-between text-slate-300">
                          <span>{isAr ? "معرف البوت:" : "Bot ID:"}</span>
                          <span className="font-mono text-orange-400 font-bold">78902134:AAFx...</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-300">
                          <span>{isAr ? "التنبيهات الفورية:" : "Instant Push Alerts:"}</span>
                          <span className="text-emerald-400 font-bold">{isAr ? "مفعّلة" : "Enabled"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                      <span className="text-xs font-bold text-white">{isAr ? "أوامر البوت التفاعلية" : "Interactive Bot Commands"}</span>
                      <div className="space-y-1.5">
                        <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-xs flex items-center justify-between">
                          <span className="font-mono text-orange-400 font-bold">/start</span>
                          <span className="text-slate-400 text-[11px]">{isAr ? "رسالة الترحيب والمنيو" : "Welcome message & menu"}</span>
                        </div>
                        <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-xs flex items-center justify-between">
                          <span className="font-mono text-orange-400 font-bold">/book</span>
                          <span className="text-slate-400 text-[11px]">{isAr ? "حجز كشف أو موعد" : "Appointment booking"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: MULTI-TENANT CLIENT MANAGER */}
              {activeScreenTab === "clients" && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-orange-500" />
                        <h3 className="text-base font-black text-white">
                          {isAr ? "إدارة دليل المشتركين ومساحات العمل" : "Multi-Tenant Workspaces & Client Manager"}
                        </h3>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {isAr ? "فصل كامل ومحمي للبيانات مع ترقية باقات الاشتراكات بضغطة زر" : "Complete isolated data workspaces with instant plan upgrades"}
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-bold">
                      Isolation: High Security 🛡️
                    </span>
                  </div>

                  {/* Workspaces Table Mockup */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/90 overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-950/80 text-[10px] font-bold uppercase text-slate-400">
                          <th className="p-3">{isAr ? "المنشأة والمالك" : "Workspace"}</th>
                          <th className="p-3">{isAr ? "القطاع" : "Sector"}</th>
                          <th className="p-3">{isAr ? "الباقة" : "Plan"}</th>
                          <th className="p-3">{isAr ? "استهلاك المحادثات" : "Usage"}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        <tr>
                          <td className="p-3 font-bold text-white flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            مستشفى الشفاء التخصصي
                          </td>
                          <td className="p-3 text-slate-400">{isAr ? "🏥 عيادات طبية" : "Clinic"}</td>
                          <td className="p-3"><span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">ENTERPRISE</span></td>
                          <td className="p-3 font-mono text-emerald-400">1,840 / 2,000</td>
                        </tr>
                        <tr>
                          <td className="p-3 font-bold text-white flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            مطعم وكافيه العمدة
                          </td>
                          <td className="p-3 text-slate-400">{isAr ? "🍔 مطاعم" : "Restaurant"}</td>
                          <td className="p-3"><span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-bold">BUSINESS</span></td>
                          <td className="p-3 font-mono text-emerald-400">620 / 1,000</td>
                        </tr>
                        <tr>
                          <td className="p-3 font-bold text-white flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            صيدلية العزبي بلس
                          </td>
                          <td className="p-3 text-slate-400">{isAr ? "💊 صيدليات" : "Pharmacy"}</td>
                          <td className="p-3"><span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">STARTER</span></td>
                          <td className="p-3 font-mono text-emerald-400">180 / 200</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          </div>
        </section>

        {/* DYNAMIC SUBSCRIPTION PLANS SECTION (EGP) */}
        <section id="pricing-plans-section" className="pt-8 space-y-6">
          <PricingPlans
            onSelectPlan={(planId: PlanId) => {
              scrollToRegistration(planId);
            }}
          />
        </section>

        {/* ABOUT SECTION */}
        <section id="about-us-section" className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 sm:p-12 space-y-8 backdrop-blur-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="max-w-3xl space-y-3 relative z-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-black uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5" />
              <span>{isAr ? "شرح المميزات والخصائص" : "Features & Capabilities"}</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              {isAr ? "كل ما تحتاجه لإدارة علاقات العملاء بذكاء" : "Everything you need for smart CRM"}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 font-medium leading-relaxed">
              {isAr
                ? "منصة متكاملة تجمع بين قوة الذكاء الاصطناعي وسهولة الاستخدام. من الرد الآلي إلى صندوق الوارد الموحد، نظام متكامل يضمن لك عدم تفويت أي فرصة بيع."
                : "An integrated platform combining AI power and ease of use. From auto-reply to unified inbox, a complete system ensuring you never miss a sale."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10 pt-4">
            <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400 font-black">
                <Bot className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-black text-white">{isAr ? "رد آلي وفهم للسياق" : "Contextual Auto-Reply"}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {isAr
                  ? "يتفهم الذكاء الاصطناعي تفاصيل منتجاتك ويجيب على أسئلة العملاء بدقة."
                  : "AI understands your product details and answers customer questions accurately."}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 font-black">
                <MessageSquare className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-black text-white">{isAr ? "صندوق وارد موحد" : "Unified Inbox"}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {isAr
                  ? "شاهد كل رسائل واتساب، انستجرام في شاشة واحدة منظمة."
                  : "View all WhatsApp and Instagram messages in one organized screen."}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 font-black">
                <Workflow className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-black text-white">{isAr ? "ربط المتاجر الإلكترونية" : "E-Commerce Sync"}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {isAr
                  ? "تكامل مباشر مع سلة وزد وشوبيفاي لمزامنة المخزون والطلبات."
                  : "Direct integration with Salla, Zid, and Shopify for inventory sync."}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6 border-t border-slate-800 relative z-10">
            <div className="text-xs text-slate-400 font-medium">
              💡 {isAr ? "هل أنت مستعد لأتمتة أعمالك ودعم عملائك فوراً؟" : "Ready to automate your customer support today?"}
            </div>
            <button
              onClick={() => scrollToRegistration()}
              className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-3 text-xs font-black text-white shadow-lg shadow-orange-500/20 hover:from-orange-600 hover:to-orange-700 transition"
            >
              <PlusCircle className="h-4 w-4" />
              <span>{isAr ? "اشترك الآن وسجّل عملك" : "Enroll Now / Register Business"}</span>
            </button>
          </div>
        </section>

        {/* INDUSTRY MODULES SHOWCASE */}
        <section className="space-y-8 pt-8 border-t border-slate-800">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              {isAr ? "حلول مخصصة حسب قطاع عملك" : "Tailored Modules by Industry Sector"}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              {isAr
                ? "قوالب ومميزات مصممة خصيصاً لتلبية احتياجات العيادات والصيدليات والمطاعم والمتاجر"
                : "Pre-configured workflows designed specifically for clinics, pharmacies, restaurants, and retail."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 space-y-3 hover:border-orange-500/50 transition">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Stethoscope className="h-6 w-6" />
              </div>
              <h3 className="text-base font-black text-white">{isAr ? "العيادات والمراكز الطبية" : "Medical Clinics"}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {isAr
                  ? "حجز الكشوفات تلقائياً، إرسال تذكيرات المواعيد للعملاء عبر الواتساب، وتوثيق الشكاوى والتقارير الطبية."
                  : "Automate appointment booking, send WhatsApp reminders, and log patient history seamlessly."}
              </p>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 space-y-3 hover:border-orange-500/50 transition">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Pill className="h-6 w-6" />
              </div>
              <h3 className="text-base font-black text-white">{isAr ? "الصيدليات" : "Pharmacies"}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {isAr
                  ? "كتالوج الأدوية الذكي، الاستعلام عن توفر العلاج والبدائل، واستقبال طلبات التوصيل للمنازل."
                  : "Medicine lookup, substitute queries, and prescription delivery requests."}
              </p>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 space-y-3 hover:border-orange-500/50 transition">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Utensils className="h-6 w-6" />
              </div>
              <h3 className="text-base font-black text-white">{isAr ? "المطاعم والكافيهات" : "Restaurants & Cafes"}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {isAr
                  ? "عرض المنيو الإلكتروني التفاعلي، استلام طلبات الدليفري والتيك أواي، وتأكيد حجز الطاولات."
                  : "Interactive digital menu, automated takeaway & delivery order taking."}
              </p>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 space-y-3 hover:border-orange-500/50 transition">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <ShoppingBag className="h-6 w-6" />
              </div>
              <h3 className="text-base font-black text-white">{isAr ? "المتاجر والشركات" : "Retail & E-Commerce"}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {isAr
                  ? "عروض المنتجات والكتالوج، متابعة حالة الشحنات والطلبات، ومزامنة تلقائية مع متاجر سلة وزد."
                  : "Product catalog browsing, order status updates, and automatic sync with Salla & Zid."}
              </p>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-8 px-6 text-xs text-slate-500 font-mono z-20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-slate-300">FOX AI AGENCY SAAS</span>
            <span>•</span>
            <span>EGP Instapay Clearance</span>
          </div>
          <div>© 2026 Fox AI Agency. All Rights Reserved.</div>
        </div>
      </footer>

      {/* Floating Agency Bot for Onboarding & Sales */}
      <AgencySalesBotWidget onSelectPlanAndRegister={(p) => scrollToRegistration(p)} />
    </div>
  );
};
