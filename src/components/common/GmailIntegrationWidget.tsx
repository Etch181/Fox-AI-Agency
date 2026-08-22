import React, { useState, useEffect } from "react";
import { Mail, CheckCircle2, LogOut, Send, AlertCircle, RefreshCw } from "lucide-react";
import { User } from "firebase/auth";
import { signInWithGoogleGmail, logoutGmail, sendGmailMessage, initGmailAuth } from "../../services/gmailService";

export const GmailIntegrationWidget: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Quick email compose state
  const [testEmail, setTestEmail] = useState("");
  const [testSubject, setTestSubject] = useState("تأكيد تفعيل الحساب - FOX AI AGENCY 🦊");
  const [testBody, setTestBody] = useState("مرحباً بك! كود تفعيل حسابك هو: 849201");
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    const unsubscribe = initGmailAuth(
      (u, t) => {
        setUser(u);
        setToken(t);
      },
      () => {
        setUser(null);
        setToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const result = await signInWithGoogleGmail();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        setSuccessMsg(`تم ربط حساب Gmail بنجاح: ${result.user.email}`);
      }
    } catch (err: any) {
      setError(err.message || "فشل تسجيل الدخول بحساب Google/Gmail");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logoutGmail();
    setUser(null);
    setToken(null);
    setSuccessMsg("تم إلغاء ربط حساب Gmail");
  };

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !testEmail) return;

    setSendingEmail(true);
    setError(null);
    setSuccessMsg(null);

    try {
      await sendGmailMessage(token, testEmail, testSubject, `<div style="font-family: sans-serif; padding: 20px; background: #0f172a; color: #fff; border-radius: 12px; border: 1px solid #334155;">
        <h2 style="color: #10b981;">FOX AI AGENCY 🦊🤖</h2>
        <p>${testBody}</p>
        <p style="font-size: 12px; color: #94a3b8;">تم إرسال هذا البريد عبر تكامل Gmail API الرسمي.</p>
      </div>`);
      setSuccessMsg(`تم إرسال البريد الإلكتروني بنجاح إلى: ${testEmail}`);
      setTestEmail("");
    } catch (err: any) {
      setError(err.message || "فشل إرسال البريد عبر Gmail");
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md">
      <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-500/20 to-amber-500/20 border border-red-500/30 flex items-center justify-center text-red-400">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              تكامل Gmail API الرسمي
              {token && (
                <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> مفعّل (Connected)
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400">
              ربط حساب Gmail لإرسال واستقبال أكواد التفعيل وإشعارات النظام مباشرة باسم وكالتك.
            </p>
          </div>
        </div>

        {token && (
          <button
            onClick={handleLogout}
            className="text-xs text-slate-400 hover:text-red-400 flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-700 hover:border-red-500/30 transition-all"
          >
            <LogOut className="w-3.5 h-3.5" /> إلغاء الربط
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {!token ? (
        <div className="py-4 text-center space-y-4">
          <p className="text-xs text-slate-300">
            اضغط على الزر أدناه لتسجيل الدخول بحساب Google وتفويض صلاحية إرسال الرسائل عبر Gmail:
          </p>
          <div className="flex justify-center">
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="group relative flex items-center gap-3 bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 border border-slate-200 disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              <span>{loading ? "جاري الربط مع Google..." : "ربط حساب Gmail (Sign in with Google)"}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="User avatar" className="w-8 h-8 rounded-full border border-emerald-500/40" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center font-bold text-xs">
                  {user?.email?.[0].toUpperCase()}
                </div>
              )}
              <div>
                <div className="text-xs font-bold text-slate-200">{user?.displayName || "مستخدم Gmail"}</div>
                <div className="text-[11px] text-slate-400">{user?.email}</div>
              </div>
            </div>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-md font-mono">
              OAuth 2.0 Active
            </span>
          </div>

          <form onSubmit={handleSendTestEmail} className="space-y-3 pt-2">
            <h4 className="text-xs font-bold text-slate-300">إرسال رسالة تجريبية مباشرة عبر Gmail API:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">البريد المستقبل (To Email)</label>
                <input
                  type="email"
                  required
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="client@example.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-red-500/50"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">عنوان الرسالة (Subject)</label>
                <input
                  type="text"
                  required
                  value={testSubject}
                  onChange={(e) => setTestSubject(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-red-500/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">محتوى الرسالة (Body)</label>
              <textarea
                rows={2}
                value={testBody}
                onChange={(e) => setTestBody(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-red-500/50"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={sendingEmail}
                className="bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {sendingEmail ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> جاري الإرسال عبر Gmail...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" /> إرسال عبر Gmail API
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
