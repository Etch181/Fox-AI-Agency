const fs = require('fs');
let code = fs.readFileSync('src/components/client/ClientCourseModule.tsx', 'utf8');

// Imports
const importRegex = /import \{ Plus, Save, X, BookOpen, Trash2, Edit2 \} from "lucide-react";/;
code = code.replace(importRegex, 'import { Plus, Save, X, BookOpen, Trash2, Edit2, MessageSquare, Star, CheckCircle, EyeOff } from "lucide-react";');

// Context hooks
const contextRegex = /const \{ currentWorkspace, courses, addCourse, updateCourse, deleteCourse, language \} = useApp\(\);/;
const contextReplace = `const { 
    currentWorkspace, 
    courses, 
    addCourse, 
    updateCourse, 
    deleteCourse, 
    courseReviews, 
    updateCourseReview, 
    deleteCourseReview, 
    language 
  } = useApp();`;
code = code.replace(contextRegex, contextReplace);

// State
const stateRegex = /const \[editingCourseId, setEditingCourseId\] = useState<string \| null>\(null\);/;
const stateReplace = `const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"courses" | "reviews">("courses");
  const [replyText, setReplyText] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);`;
code = code.replace(stateRegex, stateReplace);

// Render logic
const renderRegex = /return \(\n\s*<div className="space-y-6">\n\s*<div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">\n\s*<div className="flex items-center justify-between border-b border-slate-100 p-6 dark:border-slate-800">/m;

const renderReplace = `
  const handleReply = (reviewId: string) => {
    if (!replyText.trim()) return;
    updateCourseReview(reviewId, { reply: replyText });
    setReplyingTo(null);
    setReplyText("");
  };

  const toggleReviewStatus = (reviewId: string, currentStatus: string) => {
    updateCourseReview(reviewId, { status: currentStatus === "published" ? "hidden" : "published" });
  };

return (
    <div className="space-y-6">
      <div className="flex space-x-2 space-x-reverse border-b border-slate-200 dark:border-slate-700 pb-2">
        <button
          onClick={() => setActiveTab("courses")}
          className={\`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 \${
            activeTab === "courses"
              ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
              : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50"
          }\`}
        >
          <BookOpen className="h-4 w-4" />
          {isAr ? "الكورسات التدريبية" : "Training Courses"}
        </button>
        <button
          onClick={() => setActiveTab("reviews")}
          className={\`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 \${
            activeTab === "reviews"
              ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
              : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50"
          }\`}
        >
          <MessageSquare className="h-4 w-4" />
          {isAr ? "تقييمات الطلاب" : "Student Reviews"}
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {activeTab === "courses" ? (
        <>
        <div className="flex items-center justify-between border-b border-slate-100 p-6 dark:border-slate-800">`;
code = code.replace(renderRegex, renderReplace);

const endDivsRegex = /<\/div>\n\s*<\/div>\n\s*\);/;
const endDivsReplace = `</div>
        </>
        ) : (
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                  {isAr ? "تقييمات وآراء الطلاب" : "Student Reviews"}
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {isAr
                    ? "تابع آراء الطلاب في الكورسات وقم بالرد عليها ليتمكن البوت من مشاركتها مع العملاء المحتملين."
                    : "Track student reviews and reply to them to build trust."}
                </p>
              </div>
            </div>

            {courseReviews.length === 0 ? (
              <div className="text-center py-10">
                <MessageSquare className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {isAr ? "لا توجد تقييمات حتى الآن" : "No reviews yet"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {courseReviews.map((review) => (
                  <div key={review.id} className={\`p-4 rounded-xl border \${review.status === "hidden" ? "border-slate-200 bg-slate-50 opacity-60 dark:border-slate-700 dark:bg-slate-800/50" : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"}\`}>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 dark:text-white">{review.studentName}</h4>
                          <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full dark:bg-indigo-900/30 dark:text-indigo-400">
                            {review.courseName}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star key={star} className={\`h-3 w-3 \${star <= review.rating ? "text-amber-500 fill-amber-500" : "text-slate-300 dark:text-slate-600"}\`} />
                          ))}
                          <span className="text-xs text-slate-400 ml-2">
                            {new Date(review.date).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleReviewStatus(review.id, review.status)}
                          className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 transition"
                          title={review.status === 'published' ? (isAr ? 'إخفاء' : 'Hide') : (isAr ? 'نشر' : 'Publish')}
                        >
                          {review.status === 'published' ? <EyeOff className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => deleteCourseReview(review.id)}
                          className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-slate-700 transition"
                          title={isAr ? 'حذف' : 'Delete'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    
                    <p className="text-sm text-slate-700 dark:text-slate-300 mb-3">{review.comment}</p>

                    {review.reply ? (
                      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 border border-slate-100 dark:border-slate-800 ml-4 relative">
                        <div className="absolute top-3 -left-2 w-2 h-2 bg-slate-50 dark:bg-slate-900/50 border-l border-t border-slate-100 dark:border-slate-800 rotate-45"></div>
                        <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-1">{isAr ? "رد المركز:" : "Center Reply:"}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">{review.reply}</p>
                      </div>
                    ) : (
                      replyingTo === review.id ? (
                        <div className="mt-3 flex gap-2">
                          <input
                            type="text"
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder={isAr ? "اكتب ردك هنا..." : "Type your reply..."}
                            className="flex-1 text-sm rounded-lg border border-slate-200 px-3 py-1.5 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900"
                          />
                          <button onClick={() => handleReply(review.id)} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-700">
                            {isAr ? "إرسال" : "Send"}
                          </button>
                          <button onClick={() => setReplyingTo(null)} className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300">
                            {isAr ? "إلغاء" : "Cancel"}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setReplyingTo(review.id)}
                          className="mt-2 text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1"
                        >
                          <MessageSquare className="h-3 w-3" />
                          {isAr ? "إضافة رد" : "Add Reply"}
                        </button>
                      )
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );`;
code = code.replace(endDivsRegex, endDivsReplace);

fs.writeFileSync('src/components/client/ClientCourseModule.tsx', code);
console.log("Patched ClientCourseModule with Reviews tab");
