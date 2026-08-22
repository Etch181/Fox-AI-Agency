import React, { useState, useMemo } from "react";
import { useApp } from "../../../context/AppContext";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, CheckCircle, XCircle, Clock, CalendarClock, User, Phone } from "lucide-react";

export const BookingCalendar: React.FC = () => {
  const { appointments, updateAppointmentStatus, updateAppointment, language, currentWorkspace } = useApp();
  const isAr = language === "ar";
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  const workspaceApts = useMemo(() => {
    return appointments.filter(a => a.workspaceId === currentWorkspace?.id);
  }, [appointments, currentWorkspace]);

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleDateClick = (day: number) => {
    setSelectedDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day));
  };

  const selectedDateString = selectedDate.toISOString().split("T")[0];
  
  const selectedDayApts = useMemo(() => {
    return workspaceApts.filter(a => a.date === selectedDateString);
  }, [workspaceApts, selectedDateString]);

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Confirmed': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'Completed': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'Cancelled': return 'bg-rose-500/10 text-rose-600 border-rose-500/20';
      case 'Rescheduled': return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      default: return 'bg-amber-500/10 text-amber-600 border-amber-500/20'; // Scheduled
    }
  };

  const getStatusTextAr = (status: string) => {
    switch(status) {
      case 'Confirmed': return 'مؤكد';
      case 'Completed': return 'مكتمل';
      case 'Cancelled': return 'ملغي';
      case 'Rescheduled': return 'مُعاد جدولته';
      default: return 'مُجدول';
    }
  };

  const handleStatusUpdate = (id: string, status: 'Scheduled' | 'Confirmed' | 'Rescheduled' | 'Cancelled' | 'Completed') => {
    updateAppointmentStatus(id, status);
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  
  const monthNamesAr = [
    "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
    "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-indigo-500" />
          {isAr ? "إدارة الحجوزات والتقويم" : "Booking & Calendar Management"}
        </h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar View */}
        <div className="lg:col-span-1 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="font-bold text-slate-900 dark:text-white text-sm">
              {isAr ? monthNamesAr[currentMonth.getMonth()] : monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </div>
            <button onClick={nextMonth} className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          
          <div className="grid grid-cols-7 gap-1 mb-2 text-center text-[10px] font-bold text-slate-400">
            <div>{isAr ? "أحد" : "Sun"}</div>
            <div>{isAr ? "إثن" : "Mon"}</div>
            <div>{isAr ? "ثلا" : "Tue"}</div>
            <div>{isAr ? "أرب" : "Wed"}</div>
            <div>{isAr ? "خمي" : "Thu"}</div>
            <div>{isAr ? "جمع" : "Fri"}</div>
            <div>{isAr ? "سبت" : "Sat"}</div>
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className="h-8"></div>
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const hasApts = workspaceApts.some(a => a.date === dateStr);
              const isSelected = selectedDate.getDate() === day && selectedDate.getMonth() === currentMonth.getMonth() && selectedDate.getFullYear() === currentMonth.getFullYear();
              
              return (
                <button
                  key={day}
                  onClick={() => handleDateClick(day)}
                  className={`h-8 w-full rounded-md text-xs font-semibold flex flex-col items-center justify-center relative transition ${
                    isSelected 
                      ? "bg-indigo-500 text-white shadow-sm" 
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {day}
                  {hasApts && (
                    <span className={`absolute bottom-1 w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-indigo-500'}`}></span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Appointments List */}
        <div className="lg:col-span-2">
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-indigo-500" />
            {isAr ? "حجوزات يوم" : "Appointments for"} {selectedDate.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </h4>
          
          <div className="space-y-3">
            {selectedDayApts.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs font-medium bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                {isAr ? "لا توجد حجوزات في هذا اليوم." : "No appointments on this day."}
              </div>
            ) : (
              selectedDayApts.map(apt => (
                <div key={apt.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition hover:border-indigo-300 dark:hover:border-indigo-700">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusColor(apt.status)}`}>
                        {isAr ? getStatusTextAr(apt.status) : apt.status}
                      </span>
                      <div className="flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-300">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        {apt.timeSlot}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <div>
                        <div className="text-[10px] text-slate-400 font-medium mb-0.5">{isAr ? "المريض" : "Patient"}</div>
                        <div className="flex items-center gap-1.5 text-sm font-extrabold text-slate-900 dark:text-white">
                          <User className="h-3.5 w-3.5 text-indigo-500" />
                          {apt.patientName}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1 font-medium">
                          <Phone className="h-3.5 w-3.5" />
                          {apt.patientPhone}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 font-medium mb-0.5">{isAr ? "الطبيب / الخدمة" : "Doctor / Service"}</div>
                        <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{apt.doctorName}</div>
                        <div className="text-xs text-slate-500 font-medium mt-1">{apt.specialty}</div>
                      </div>
                    </div>
                    
                    {apt.notes && (
                      <div className="mt-3 text-xs bg-amber-50 dark:bg-amber-900/10 text-amber-800 dark:text-amber-500 p-2 rounded-lg border border-amber-100 dark:border-amber-900/30">
                        <span className="font-bold">{isAr ? "ملاحظات: " : "Notes: "}</span>{apt.notes}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex sm:flex-col gap-2 shrink-0">
                    {apt.status === 'Scheduled' && (
                      <>
                        <button 
                          onClick={() => handleStatusUpdate(apt.id, 'Confirmed')}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition"
                        >
                          <CheckCircle className="h-3.5 w-3.5" /> {isAr ? "تأكيد" : "Confirm"}
                        </button>
                        <button 
                          onClick={() => {
                            const newTime = window.prompt(isAr ? "أدخل الموعد الجديد (مثال: 02:00 PM)" : "Enter new time slot (e.g. 02:00 PM)");
                            if (newTime) {
                              updateAppointment(apt.id, { status: "Rescheduled", timeSlot: newTime });
                            }
                          }}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-purple-50 dark:bg-purple-500/10 text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-500/20 px-3 py-1.5 rounded-lg text-xs font-bold transition"
                        >
                          <Clock className="h-3.5 w-3.5" /> {isAr ? "إعادة جدولة" : "Reschedule"}
                        </button>
                        <button 
                          onClick={() => handleStatusUpdate(apt.id, "Cancelled")}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-rose-50 dark:bg-rose-500/10 text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-500/20 px-3 py-1.5 rounded-lg text-xs font-bold transition"
                        >
                          <XCircle className="h-3.5 w-3.5" /> {isAr ? "إلغاء" : "Cancel"}
                        </button>
                      </>
                    )}
                    {apt.status === 'Confirmed' && (
                      <button 
                        onClick={() => handleStatusUpdate(apt.id, 'Completed')}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition"
                      >
                        <CheckCircle className="h-3.5 w-3.5" /> {isAr ? "إنهاء الزيارة" : "Complete"}
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
