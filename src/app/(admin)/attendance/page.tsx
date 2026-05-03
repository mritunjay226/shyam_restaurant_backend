"use client";

import { useState } from "react";
import { format, subDays, addDays } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, CheckCircle2, XCircle, Clock, Save, Loader2, Users } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { DesktopTopbar } from "@/components/Topbar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/providers/AuthProvider";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS = [
  { id: "present", label: "Present", icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
  { id: "absent",  label: "Absent",  icon: XCircle,      color: "text-rose-600",    bg: "bg-rose-50",    border: "border-rose-200" },
  { id: "half_day", label: "Half Day", icon: Clock,      color: "text-amber-600",   bg: "bg-amber-50",   border: "border-amber-200" },
  { id: "paid_leave", label: "Paid Leave", icon: CalendarIcon, color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-200" },
];

export default function AttendancePage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const { token: sessionToken } = useAuth();

  const staff = useQuery(api.staff.getAllStaff, sessionToken ? { token: sessionToken } : "skip") || [];
  const existingAttendance = useQuery(api.attendance.getDateAttendance, sessionToken ? { token: sessionToken, date: dateStr } : "skip") || [];
  const markAttendance = useMutation(api.attendance.markDailyAttendance);

  const [localRecords, setLocalRecords] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Sync local records when existing attendance loads
  const isLoading = !staff || !existingAttendance;

  const handleStatusChange = (staffId: string, status: string) => {
    setLocalRecords(prev => ({ ...prev, [staffId]: status }));
  };

  const onSave = async () => {
    const recordsToSave = staff.map(s => ({
      staffId: s._id,
      status: localRecords[s._id] || existingAttendance.find(a => a.staffId === s._id)?.status || "present",
    }));

    if (!sessionToken) return;
    setIsSaving(true);
    try {
      await markAttendance({
        token: sessionToken,
        date: dateStr,
        records: recordsToSave,
      });
      toast.success(`Attendance saved for ${format(selectedDate, "dd MMM yyyy")}`);
      setLocalRecords({});
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50/50">
      <DesktopTopbar title="Staff Attendance" />

      <div className="flex-1 p-4 lg:p-8 max-w-5xl mx-auto w-full space-y-6">
        {/* Date Selector Header */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center text-violet-600">
              <CalendarIcon size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{format(selectedDate, "EEEE, dd MMMM")}</h2>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mt-1">Daily Manpower Status</p>
            </div>
          </div>

          <div className="flex items-center bg-gray-50 p-1 rounded-xl border border-gray-100">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setSelectedDate(subDays(selectedDate, 1))}
              className="rounded-lg hover:bg-white hover:shadow-sm h-10 w-10 text-gray-500"
            >
              <ChevronLeft size={20} />
            </Button>
            <div className="px-4 py-2 font-black text-xs text-gray-700 tabular-nums uppercase tracking-widest">
              {format(selectedDate, "MMM yyyy")}
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              disabled={dateStr === format(new Date(), "yyyy-MM-dd")}
              onClick={() => setSelectedDate(addDays(selectedDate, 1))}
              className="rounded-lg hover:bg-white hover:shadow-sm h-10 w-10 text-gray-500"
            >
              <ChevronRight size={20} />
            </Button>
          </div>
        </div>

        {/* Staff Grid */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/30 flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-500 uppercase tracking-widest font-black text-[10px]">
              <Users size={12} /> Personnel List
            </div>
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              {staff.length} Employees Registered
            </div>
          </div>

          <div className="divide-y divide-gray-50">
            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <Loader2 size={32} className="text-violet-600 animate-spin" />
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Syncing attendance ledger...</p>
              </div>
            ) : staff.length === 0 ? (
              <div className="py-20 text-center text-gray-400 font-black text-[10px] uppercase tracking-widest">No staff members found.</div>
            ) : (
              staff.map(s => {
                const currentStatus = localRecords[s._id] || existingAttendance.find(a => a.staffId === s._id)?.status || "present";
                return (
                  <div key={s._id} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/20 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center text-violet-700 font-black text-xs shadow-sm ring-2 ring-white">
                        {s.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 leading-tight">{s.name}</p>
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">{s.role.replace("_", " ")}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {STATUS_OPTIONS.map(opt => {
                        const isActive = currentStatus === opt.id;
                        return (
                          <button
                            key={opt.id}
                            onClick={() => handleStatusChange(s._id, opt.id)}
                            className={cn(
                              "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                              isActive
                                ? cn(opt.bg, opt.color, opt.border, "shadow-sm scale-105")
                                : "bg-white text-gray-300 border-gray-100 hover:border-gray-200"
                            )}
                          >
                            <opt.icon size={12} />
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Action Area */}
          <div className="p-6 bg-white border-t border-gray-100 flex justify-end shadow-[0_-4px_12px_rgba(0,0,0,0.02)]">
            <Button 
              disabled={isSaving || isLoading} 
              onClick={onSave}
              className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl h-12 px-10 font-black text-xs uppercase tracking-widest gap-2 shadow-lg shadow-violet-100 active:scale-95 transition-all w-full sm:w-auto"
            >
              {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
              Save Attendance
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
