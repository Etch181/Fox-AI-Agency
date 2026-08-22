import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import { Plus, Save, X, BookOpen, Trash2, Edit2, MessageSquare, Star, CheckCircle, EyeOff } from "lucide-react";

export const ClientCourseModule: React.FC = () => {
  const { 
    currentWorkspace, 
    courses, 
    addCourse, 
    updateCourse, 
    deleteCourse, 
    courseReviews, 
    updateCourseReview, 
    deleteCourseReview, 
    language 
  } = useApp();
  const isAr = language === "ar";
  
  const [isAddingCourse, setIsAddingCourse] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"courses" | "reviews">("courses");
  const [replyText, setReplyText] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  const [courseName, setCourseName] = useState("");
  const [coursePrice, setCoursePrice] = useState("");
  const [courseDuration, setCourseDuration] = useState("");
  const [courseInstructor, setCourseInstructor] = useState("");
  const [courseDescription, setCourseDescription] = useState("");

  if (!currentWorkspace) return null;

  const handleSaveCourse = () => {
    if (!courseName.trim() || !coursePrice) return;
    
    if (editingCourseId) {
      updateCourse(editingCourseId, {
        name: courseName,
        price: Number(coursePrice),
        duration: courseDuration,
        instructor: courseInstructor,
        description: courseDescription,
      });
      setEditingCourseId(null);
    } else {
      addCourse({
        name: courseName,
        price: Number(coursePrice),
        duration: courseDuration,
        instructor: courseInstructor,
        description: courseDescription,
      });
      setIsAddingCourse(false);
    }
    
    resetForm();
  };

  const resetForm = () => {
    setCourseName("");
    setCoursePrice("");
    setCourseDuration("");
    setCourseInstructor("");
    setCourseDescription("");
  };

  const handleEditCourse = (course: any) => {
    setEditingCourseId(course.id);
    setCourseName(course.name);
    setCoursePrice(course.price.toString());
    setCourseDuration(course.duration);
    setCourseInstructor(course.instructor || "");
    setCourseDescription(course.description || "");
    setIsAddingCourse(true);
  };

  const handleCancel = () => {
    setIsAddingCourse(false);
    setEditingCourseId(null);
    resetForm();
  };

  
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
          className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 ${
            activeTab === "courses"
              ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
              : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50"
          }`}
        >
          <BookOpen className="h-4 w-4" />
          {isAr ? "الكورسات التدريبية" : "Training Courses"}
        </button>
        <button
          onClick={() => setActiveTab("reviews")}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 ${
            activeTab === "reviews"
              ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
              : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50"
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          {isAr ? "تقييمات الطلاب" : "Student Reviews"}
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {activeTab === "courses" ? (
        <>
        <div className="flex items-center justify-between border-b border-slate-100 p-6 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-indigo-500" />
              {isAr ? "الدورات والكورسات المتاحة" : "Available Courses & Training"}
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {isAr
                ? "قم بإضافة الدورات التدريبية ليتمكن وكيل الذكاء الاصطناعي من الإجابة عنها والحجز للمتدربين."
                : "Add courses so the AI agent can answer inquiries and handle bookings."}
            </p>
          </div>
          {!isAddingCourse && (
            <button
              onClick={() => setIsAddingCourse(true)}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-700 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              {isAr ? "إضافة كورس" : "Add Course"}
            </button>
          )}
        </div>

        {isAddingCourse && (
          <div className="border-b border-slate-100 p-6 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isAr ? "اسم الكورس" : "Course Name"}
                </label>
                <input
                  type="text"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  placeholder={isAr ? "مثال: دبلومة المحادثة" : "e.g. Conversation Diploma"}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isAr ? "السعر (جنيه)" : "Price (EGP)"}
                </label>
                <input
                  type="number"
                  value={coursePrice}
                  onChange={(e) => setCoursePrice(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isAr ? "المدة (مثال: 6 أسابيع / 12 محاضرة)" : "Duration (e.g. 6 Weeks / 12 Lectures)"}
                </label>
                <input
                  type="text"
                  value={courseDuration}
                  onChange={(e) => setCourseDuration(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isAr ? "المدرب / المحاضر" : "Instructor"}
                </label>
                <input
                  type="text"
                  value={courseInstructor}
                  onChange={(e) => setCourseInstructor(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isAr ? "وصف ومحتوى الكورس" : "Course Description & Content"}
                </label>
                <textarea
                  value={courseDescription}
                  onChange={(e) => setCourseDescription(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={handleCancel}
                className="rounded-xl px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 transition dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {isAr ? "إلغاء" : "Cancel"}
              </button>
              <button
                onClick={handleSaveCourse}
                disabled={!courseName.trim() || !coursePrice}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {isAr ? "حفظ الكورس" : "Save Course"}
              </button>
            </div>
          </div>
        )}

        <div className="p-6">
          {courses.length === 0 && !isAddingCourse ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                <BookOpen className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {isAr ? "لم تقم بإضافة أي كورسات بعد" : "No courses added yet"}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                {isAr
                  ? "أضف قائمة الكورسات الخاصة بمركز التدريب ليتمكن الوكيل الذكي من بيعها"
                  : "Add your course list so the AI agent can sell them"}
              </p>
              <button
                onClick={() => setIsAddingCourse(true)}
                className="mt-4 flex items-center gap-2 rounded-xl bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 px-4 py-2 text-sm font-bold transition hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
              >
                <Plus className="h-4 w-4" />
                {isAr ? "إضافة كورس جديد" : "Add New Course"}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <h4 className="font-bold text-slate-900 dark:text-white">{course.name}</h4>
                      <span className="rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        {course.price} EGP
                      </span>
                    </div>
                    {course.instructor && (
                      <p className="mt-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                        {isAr ? "المدرب:" : "Instructor:"} {course.instructor}
                      </p>
                    )}
                    {course.duration && (
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {isAr ? "المدة:" : "Duration:"} {course.duration}
                      </p>
                    )}
                    {course.description && (
                      <p className="mt-3 text-xs text-slate-500 line-clamp-2 dark:text-slate-400">
                        {course.description}
                      </p>
                    )}
                  </div>
                  <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-700">
                    <button
                      onClick={() => handleEditCourse(course)}
                      className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-indigo-600 dark:hover:bg-slate-700 transition"
                      title={isAr ? "تعديل" : "Edit"}
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteCourse(course.id)}
                      className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-slate-700 transition"
                      title={isAr ? "حذف" : "Delete"}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div></>
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
                  <div key={review.id} className={`p-4 rounded-xl border ${review.status === "hidden" ? "border-slate-200 bg-slate-50 opacity-60 dark:border-slate-700 dark:bg-slate-800/50" : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"}`}>
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
                            <Star key={star} className={`h-3 w-3 ${star <= review.rating ? "text-amber-500 fill-amber-500" : "text-slate-300 dark:text-slate-600"}`} />
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
  );
};
