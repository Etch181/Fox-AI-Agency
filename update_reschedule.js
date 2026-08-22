const fs = require('fs');
const file = 'src/components/client/clinic/BookingCalendar.tsx';
let content = fs.readFileSync(file, 'utf8');

// replace the actions block for 'Scheduled' to include 'Reschedule'
const target = `<button \n                          onClick={() => handleStatusUpdate(apt.id, 'Cancelled')}`;

const replacement = `<button 
                          onClick={() => {
                            const newTime = window.prompt(isAr ? "أدخل الموعد الجديد (مثال: 02:00 PM)" : "Enter new time slot (e.g. 02:00 PM)");
                            if (newTime) {
                              updateAppointmentStatus(apt.id, 'Rescheduled');
                              // Assuming we had an updateAppointment method, we would use it to update the slot
                              // updateAppointment(apt.id, { status: 'Rescheduled', timeSlot: newTime });
                            }
                          }}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-amber-50 dark:bg-amber-500/10 text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-500/20 px-3 py-1.5 rounded-lg text-xs font-bold transition"
                        >
                          <Clock className="h-3.5 w-3.5" /> {isAr ? "إعادة جدولة" : "Reschedule"}
                        </button>
                        <button 
                          onClick={() => handleStatusUpdate(apt.id, 'Cancelled')}`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  
  // Actually we need to make sure updateAppointment is available from useApp
  content = content.replace("updateAppointmentStatus, language", "updateAppointmentStatus, updateAppointment, language");
  
  content = content.replace(
    "updateAppointmentStatus(apt.id, 'Rescheduled');",
    "updateAppointment(apt.id, { status: 'Rescheduled', timeSlot: newTime });"
  );
  
  fs.writeFileSync(file, content);
  console.log("Updated");
} else {
  console.log("Not found");
}
