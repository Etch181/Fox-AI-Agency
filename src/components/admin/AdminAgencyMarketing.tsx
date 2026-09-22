import React, { useEffect, useState } from "react";
import { authenticatedFetch } from "../../services/authenticatedFetch";
import { useTranslation } from "../../services/LanguageService";
import {
  Sparkles,
  Lightbulb,
  Facebook,
  Instagram,
  FileText,
  Image as ImageIcon,
  Video,
  Clock3,
  CalendarDays,
  Copy,
  Check,
  RefreshCw,
  Send,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";

type Platform = "facebook" | "instagram";
type Format = "text" | "image" | "video";

interface Idea {
  title: string;
  angle: string;
  audience: string;
  cta: string;
  format: Format;
}

interface AgencyPost {
  id: string;
  topic: string;
  platform: Platform;
  format: Format;
  headline?: string;
  caption?: string;
  cta?: string;
  hashtags?: string[];
  visualConcept?: string;
  videoHook?: string;
  videoScript?: string;
  generatedAt?: string;
  status?: string;
  scheduledAt?: string | null;
  recommendedTime?: any;
}

export const AdminAgencyMarketing: React.FC = () => {
  const { isAr } = useTranslation();
  const [platform, setPlatform] = useState<Platform>("facebook");
  const [format, setFormat] = useState<Format>("text");
  const [campaignType, setCampaignType] = useState(isAr ? "بناء الوعي بالوكالة" : "Agency awareness");
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState(isAr ? "أصحاب ومديرو المنشآت في مصر" : "Business owners and managers in Egypt");
  const [tone, setTone] = useState(isAr ? "احترافي، ذكي، مقنع وعملي" : "Premium, intelligent, persuasive and practical");
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [post, setPost] = useState<AgencyPost | null>(null);
  const [history, setHistory] = useState<AgencyPost[]>([]);
  const [timing, setTiming] = useState<any>(null);
  const [scheduleAt, setScheduleAt] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void loadHistory();
    void loadTiming();
  }, [platform]);

  async function loadHistory() {
    try {
      const response = await authenticatedFetch("/api/agency/marketing/posts");
      const data = await response.json();
      if (response.ok && data?.success) setHistory(Array.isArray(data.posts) ? data.posts : []);
    } catch {}
  }

  async function loadTiming() {
    try {
      const response = await authenticatedFetch("/api/agency/marketing/timing/" + platform);
      const data = await response.json();
      if (response.ok && data?.success) setTiming(data.timing);
    } catch {}
  }

  async function suggestIdeas() {
    setBusy("ideas");
    setMessage("");
    try {
      const response = await authenticatedFetch("/api/agency/marketing/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          language: isAr ? "ar" : "en",
          campaignType,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data?.success) throw new Error(data?.code || "IDEAS_FAILED");
      setIdeas(Array.isArray(data.ideas) ? data.ideas : []);
    } catch {
      setMessage(isAr ? "تعذر توليد الأفكار الآن." : "Could not generate ideas.");
    } finally {
      setBusy(null);
    }
  }

  async function generatePost() {
    if (!topic.trim()) {
      setMessage(isAr ? "اكتب أو اختر موضوعًا أولًا." : "Choose a topic first.");
      return;
    }
    setBusy("generate");
    setMessage("");
    try {
      const response = await authenticatedFetch("/api/agency/marketing/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          platform,
          format,
          audience,
          tone,
          language: isAr ? "ar" : "en",
        }),
      });
      const data = await response.json();
      if (!response.ok || !data?.success) throw new Error(data?.code || "GENERATE_FAILED");
      setPost({ id: data.id, topic, platform, format, ...(data.post || {}), recommendedTime: data.timing });
      setTiming(data.timing);
      setScheduleAt(data.timing?.recommendedTime ? String(data.timing.recommendedTime).slice(0, 16) : "");
      await loadHistory();
    } catch {
      setMessage(isAr ? "تعذر توليد المنشور. جرّب مرة أخرى." : "Could not generate the post.");
    } finally {
      setBusy(null);
    }
  }

  async function schedulePost() {
    if (!post?.id || !scheduleAt) return;
    setBusy("schedule");
    setMessage("");
    try {
      const response = await authenticatedFetch("/api/agency/marketing/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: post.id,
          scheduledAt: new Date(scheduleAt).toISOString(),
          mode: "MANUAL_APPROVAL",
        }),
      });
      const data = await response.json();
      if (!response.ok || !data?.success) throw new Error(data?.message || data?.code || "SCHEDULE_FAILED");
      setMessage(isAr ? "تمت جدولة منشور FOX للمراجعة قبل النشر." : "FOX post scheduled for approval before publishing.");
      await loadHistory();
    } catch (error: any) {
      setMessage(error?.message || (isAr ? "تعذر حفظ الجدولة." : "Could not schedule the post."));
    } finally {
      setBusy(null);
    }
  }

  async function copyCaption() {
    const text = post?.caption || "";
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="space-y-6 pb-10 animate-fade-in">
      <section className="relative overflow-hidden rounded-[2rem] border border-orange-500/20 bg-slate-950 p-7 md:p-9 text-white shadow-[0_25px_80px_rgba(15,23,42,.35)]">
        <div className="absolute inset-0 opacity-60 fox-marketing-grid" />
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="absolute -bottom-20 left-20 h-56 w-56 rounded-full bg-violet-600/10 blur-3xl" />
        <div className="relative z-10 max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-400/20 bg-orange-400/10 px-3 py-1 text-[10px] font-black tracking-wider text-orange-300">
            <Sparkles className="h-3.5 w-3.5" />
            FOX AGENCY MARKETING
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight md:text-5xl">
            {isAr ? "مختبر تسويق FOX نفسه" : "FOX Agency Marketing Studio"}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
            {isAr
              ? "هذه الصفحة للـFOX فقط. لا تستخدم بيانات أي منشأة مشتركة، ولا تعتمد على Workspace أو Plan أو رصيد العميل."
              : "This is for FOX itself. It never uses a client workspace, client plan, or tenant AI balance."}
          </p>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <aside className="glass-panel rounded-[2rem] p-5 md:p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[.18em] text-orange-500">{isAr ? "الحملة" : "Campaign"}</div>
              <div className="mt-1 text-lg font-black text-slate-900 dark:text-white">{campaignType}</div>
            </div>
            <button
              type="button"
              onClick={suggestIdeas}
              disabled={busy === "ideas"}
              className="rounded-xl bg-orange-500/10 px-3 py-2 text-[10px] font-black text-orange-600"
            >
              {busy === "ideas" ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Lightbulb className="h-4 w-4" />}
            </button>
          </div>

          <select
            value={campaignType}
            onChange={(e) => setCampaignType(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          >
            <option>{isAr ? "بناء الوعي بالوكالة" : "Agency awareness"}</option>
            <option>{isAr ? "شرح مشكلة وحل بـFOX" : "Problem → FOX solution"}</option>
            <option>{isAr ? "شرح ميزة" : "Feature education"}</option>
            <option>{isAr ? "عرض الباقات والخدمات" : "Offer and packages"}</option>
            <option>{isAr ? "دراسة حالة / سيناريو استخدام" : "Case study / use case"}</option>
            <option>{isAr ? "وراء الكواليس" : "Behind the scenes"}</option>
            <option>{isAr ? "محتوى تثقيفي عن AI والـAutomation" : "AI and automation education"}</option>
          </select>

          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setPlatform("facebook")} className={"rounded-2xl border p-3 text-xs font-black " + (platform === "facebook" ? "border-blue-500 bg-blue-500/10 text-blue-600" : "border-slate-200 text-slate-500 dark:border-slate-800")}>
              <Facebook className="mx-auto mb-1 h-5 w-5" /> Facebook
            </button>
            <button type="button" onClick={() => setPlatform("instagram")} className={"rounded-2xl border p-3 text-xs font-black " + (platform === "instagram" ? "border-pink-500 bg-pink-500/10 text-pink-600" : "border-slate-200 text-slate-500 dark:border-slate-800")}>
              <Instagram className="mx-auto mb-1 h-5 w-5" /> Instagram
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {([
              ["text", FileText, isAr ? "نص" : "Text"],
              ["image", ImageIcon, isAr ? "صورة" : "Image"],
              ["video", Video, isAr ? "فيديو" : "Video"],
            ] as const).map(([value, Icon, label]) => (
              <button key={value} type="button" onClick={() => setFormat(value)} className={"rounded-2xl border p-2.5 text-[10px] font-black " + (format === value ? "border-orange-500 bg-orange-500/10 text-orange-600" : "border-slate-200 text-slate-500 dark:border-slate-800")}>
                <Icon className="mx-auto mb-1 h-4 w-4" />{label}
              </button>
            ))}
          </div>

          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            rows={4}
            placeholder={isAr ? "اكتب موضوعًا لـFOX أو استخدم اقتراحات الذكاء الاصطناعي..." : "Write a FOX topic or use AI suggestions..."}
            className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs leading-6 outline-none focus:border-orange-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          />

          {ideas.length > 0 && (
            <div className="space-y-2">
              {ideas.map((idea) => (
                <button key={idea.title} type="button" onClick={() => setTopic(idea.title)} className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-left dark:border-slate-800 dark:bg-slate-950">
                  <div className="text-xs font-black text-slate-900 dark:text-white">{idea.title}</div>
                  <div className="mt-1 text-[10px] leading-5 text-slate-500">{idea.angle}</div>
                  <div className="mt-2 text-[9px] font-bold text-orange-500">{idea.cta}</div>
                </button>
              ))}
            </div>
          )}

          <div>
            <label className="mb-2 block text-xs font-black text-slate-700 dark:text-slate-300">{isAr ? "الجمهور" : "Audience"}</label>
            <input value={audience} onChange={(e) => setAudience(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs dark:border-slate-800 dark:bg-slate-950 dark:text-white" />
          </div>

          <button type="button" onClick={generatePost} disabled={busy === "generate"} className="w-full rounded-2xl bg-orange-600 px-4 py-4 text-sm font-black text-white shadow-lg shadow-orange-500/20 disabled:opacity-50">
            <span className="flex items-center justify-center gap-2">
              {busy === "generate" ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
              {busy === "generate" ? (isAr ? "FOX يفكر..." : "FOX is thinking...") : (isAr ? "توليد منشور FOX" : "Generate FOX post")}
            </span>
          </button>
        </aside>

        <main className="space-y-5">
          {post ? (
            <>
              <section className="glass-panel rounded-[2rem] p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[.16em] text-orange-500">{post.platform} · {post.format}</div>
                    <h2 className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{post.headline || post.topic}</h2>
                  </div>
                  <button type="button" onClick={copyCaption} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white dark:bg-white dark:text-slate-950">
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? (isAr ? "تم" : "Copied") : (isAr ? "نسخ" : "Copy")}
                  </button>
                </div>

                <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-5 whitespace-pre-wrap text-sm leading-8 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
                  {post.caption || "—"}
                </div>

                {post.hashtags?.length ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {post.hashtags.map((tag) => <span key={tag} className="rounded-full bg-orange-500/10 px-3 py-1 text-[10px] font-bold text-orange-600">{tag}</span>)}
                  </div>
                ) : null}

                {post.visualConcept && (
                  <div className="mt-4 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-[11px] leading-6 text-violet-900 dark:border-violet-900/40 dark:bg-violet-950/20 dark:text-violet-200">
                    <div className="mb-1 font-black">{isAr ? "Concept بصري" : "Visual concept"}</div>
                    {post.visualConcept}
                  </div>
                )}

                {post.videoScript && (
                  <div className="mt-4 rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-[11px] leading-6 text-indigo-900 dark:border-indigo-900/40 dark:bg-indigo-950/20 dark:text-indigo-200">
                    <div className="mb-1 font-black">{isAr ? "سكريبت الفيديو" : "Video script"}</div>
                    {post.videoScript}
                  </div>
                )}
              </section>

              <section className="glass-panel rounded-[2rem] p-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-amber-500/10 p-2.5 text-amber-600"><Clock3 className="h-5 w-5" /></div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">{isAr ? "تحليل توقيت النشر" : "Publishing timing"}</h3>
                    <p className="text-[10px] text-slate-500">{isAr ? "التوصية الحالية هي heuristic إلى أن تتجمع بيانات أداء FOX الحقيقية." : "Current timing is heuristic until FOX has real performance evidence."}</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><div className="text-[10px] font-black text-amber-700">{isAr ? "الوقت" : "Time"}</div><div className="mt-2 text-lg font-black">{timing?.recommendedTime || "—"}</div></div>
                  <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4"><div className="text-[10px] font-black text-sky-700">{isAr ? "الأيام" : "Days"}</div><div className="mt-2 text-sm font-black">{Array.isArray(timing?.bestDays) ? timing.bestDays.join(" + ") : "—"}</div></div>
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><div className="text-[10px] font-black text-emerald-700">{isAr ? "المصدر" : "Source"}</div><div className="mt-2 text-sm font-black">{timing?.source === "recorded_evidence" ? (isAr ? "بيانات فعلية" : "Recorded evidence") : (isAr ? "توصية أولية" : "Heuristic")}</div></div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
                  <input type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} className="rounded-2xl border border-slate-200 bg-white p-3 text-xs dark:border-slate-800 dark:bg-slate-950 dark:text-white" />
                  <button type="button" onClick={schedulePost} disabled={busy === "schedule" || !scheduleAt} className="rounded-2xl bg-orange-600 px-5 py-3 text-xs font-black text-white disabled:opacity-50">
                    {busy === "schedule" ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CalendarDays className="h-4 w-4 inline mr-1" />}
                    {isAr ? "جدولة للمراجعة" : "Schedule for approval"}
                  </button>
                </div>

                <div className="mt-3 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-[10px] leading-5 text-amber-900 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-200">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  {isAr ? "النشر التلقائي لن يُفعل بوهم أو API مزيف. سيظهر كمفعل فقط بعد ربط حسابات FOX الفعلية." : "Auto-publish is never faked; it becomes available only after FOX's real social accounts are connected."}
                </div>
              </section>
            </>
          ) : (
            <section className="glass-panel flex min-h-[560px] items-center justify-center rounded-[2rem] p-8 text-center">
              <div className="max-w-lg">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-orange-500/10 text-orange-500"><Send className="h-9 w-9" /></div>
                <h2 className="mt-5 text-2xl font-black text-slate-900 dark:text-white">{isAr ? "هنا تسويق FOX فقط" : "This is FOX-only marketing"}</h2>
                <p className="mt-2 text-sm leading-7 text-slate-500">{isAr ? "لا توجد بيانات منشآت هنا. استخدم الذكاء الاصطناعي لبناء أفكار ومنشورات عن FOX ومنتجها وخدماتها." : "No tenant data lives here. Use AI to create FOX-focused content around the product, capabilities and business value."}</p>
              </div>
            </section>
          )}

          {history.length > 0 && (
            <section className="glass-panel rounded-[2rem] p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 dark:text-white">{isAr ? "آخر منشورات FOX" : "Recent FOX posts"}</h3>
                <span className="text-[10px] font-bold text-slate-400">{history.length}</span>
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                {history.slice(0, 8).map((item) => (
                  <button key={item.id} type="button" onClick={() => setPost(item)} className="rounded-2xl border border-slate-200 bg-white p-4 text-left dark:border-slate-800 dark:bg-slate-950">
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-500"><ShieldCheck className="h-4 w-4 text-orange-500" /> FOX · {item.platform}</div>
                    <div className="mt-2 text-xs font-black text-slate-900 dark:text-white">{item.headline || item.topic}</div>
                    <div className="mt-1 line-clamp-3 text-[10px] leading-5 text-slate-500">{item.caption || ""}</div>
                  </button>
                ))}
              </div>
            </section>
          )}
        </main>
      </div>

      {message && <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-2xl border border-slate-700 bg-slate-950 px-5 py-3 text-xs font-bold text-white shadow-2xl">{message}</div>}
    </div>
  );
};
