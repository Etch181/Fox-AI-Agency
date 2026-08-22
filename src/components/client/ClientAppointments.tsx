import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import { Calendar as CalendarIcon, Clock, User, CheckCircle2, XCircle, AlertCircle, Plus } from "lucide-react";

export const ClientAppointments: React.FC = () => {
  const { currentWorkspace, appointments, doctors, updateAppointmentStatus, addAppointment } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [doctorId, setDoctorId] = useState(doctors[0]?.id || "");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [timeSlot, setTimeSlot] = useState("05:00 PM");

  if (!currentWorkspace) return null;

  const workspaceApts = appointments.filter((a) => a.workspaceId === currentWorkspace.id);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const doc = doctors.find((d) => d.id === doctorId);

    addAppointment({
      workspaceId: currentWorkspace.id,
      patientName,
      patientPhone,
      doctorId,
      doctorName: doc?.name || "Dr. Sameh Nader",
      specialty: doc?.specialty || "Dentistry",
      date,
      timeSlot,
      status: "Confirmed",
      channel: "WhatsApp",
    });

    setIsModalOpen(false);
    setPatientName("");
    setPatientPhone("");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white sm:text-2xl flex items-center gap-2">
            <CalendarIcon className="h-6 w-6 text-emerald-500" />
            Patient Appointments Schedule
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Appointments booked automatically by Gemini AI Agent via WhatsApp/Telegram or added by reception staff.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2 text-xs font-bold text-white shadow-md shadow-orange-500/20 hover:bg-orange-600 transition"
        >
          <Plus className="h-4 w-4" />
          Schedule New Appointment
        </button>
      </div>

      {/* Appointments List */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-800/60">
                <th className="py-3 px-4">Patient Name & Contact</th>
                <th className="py-3 px-4">Assigned Doctor</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Channel</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {workspaceApts.map((apt) => (
                <tr key={apt.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                    {apt.patientName}
                    <p className="text-[11px] font-mono text-slate-400 font-normal">{apt.patientPhone}</p>
                  </td>

                  <td className="py-3.5 px-4">
                    <p className="font-extrabold text-slate-800 dark:text-slate-200">{apt.doctorName}</p>
                    <p className="text-[10px] text-orange-600 dark:text-orange-400 font-semibold">{apt.specialty}</p>
                  </td>

                  <td className="py-3.5 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                    {apt.date} • {apt.timeSlot}
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      {apt.channel}
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    <span
                      className={`rounded-md px-2.5 py-1 text-[10px] font-bold ${
                        apt.status === "Confirmed"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : apt.status === "Completed"
                          ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                          : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {apt.status}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => updateAppointmentStatus(apt.id, "Completed")}
                        className="rounded-lg bg-blue-500/10 px-2 py-1 text-[10px] font-bold text-blue-600 hover:bg-blue-500 hover:text-white transition"
                      >
                        Complete
                      </button>
                      <button
                        onClick={() => updateAppointmentStatus(apt.id, "Cancelled")}
                        className="rounded-lg bg-rose-500/10 px-2 py-1 text-[10px] font-bold text-rose-600 hover:bg-rose-500 hover:text-white transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800">
              Schedule Appointment
            </h3>

            <form onSubmit={handleCreate} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Patient Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Tarek Gamal"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Patient Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="+2010..."
                  value={patientPhone}
                  onChange={(e) => setPatientPhone(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-bold text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Time Slot
                  </label>
                  <input
                    type="text"
                    value={timeSlot}
                    onChange={(e) => setTimeSlot(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-bold text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 rounded-xl border border-slate-200 py-2 text-xs font-bold text-slate-600 dark:border-slate-800 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-orange-500 py-2 text-xs font-bold text-white shadow-md hover:bg-orange-600"
                >
                  Confirm Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
