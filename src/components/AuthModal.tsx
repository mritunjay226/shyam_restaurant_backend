"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, ChevronLeft, UserCircle2, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Id } from "../../convex/_generated/dataModel";

type StaffBasic = { _id: Id<"staff">; name: string; role: string; isLocked?: boolean };

export default function AuthModal() {
  const { login } = useAuth();
  const staffList = (useQuery(api.auth.getActiveStaffNames) || []) as StaffBasic[];

  const [selectedStaff, setSelectedStaff] = useState<StaffBasic | null>(null);
  const [pin, setPin] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isError, setIsError] = useState(false);
  const [shakeTrigger, setShakeTrigger] = useState(0);

  const triggerError = () => {
    setIsError(true);
    setShakeTrigger((n) => n + 1);
  };

  const handleKeyPress = (key: string) => {
    if (pin.length < 4 && !isSubmitting) {
      setIsError(false);
      setPin((prev) => prev + key);
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setIsError(false);
  };

  const handleLogin = useCallback(async () => {
    if (pin.length !== 4 || !selectedStaff || isSubmitting) return;
    setIsSubmitting(true);
    setIsError(false);
    try {
      await login(pin, selectedStaff._id);
      toast.success(`Welcome back, ${selectedStaff.name}!`);
    } catch (error: any) {
      // ConvexError puts user-facing text in .data; plain Error uses .message
      const msg: string = error.data ?? error.message ?? "Incorrect PIN";
      toast.error(msg, { duration: msg.toLowerCase().includes("locked") ? 8000 : 3500 });
      triggerError();
      setPin("");
    } finally {
      setIsSubmitting(false);
    }
  }, [pin, selectedStaff, isSubmitting, login]);

  useEffect(() => {
    if (pin.length === 4 && !isSubmitting) {
      handleLogin();
    }
  }, [pin, isSubmitting, handleLogin]);

  // Handle physical keyboard input
  useEffect(() => {
    if (!selectedStaff) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Numbers 0-9
      if (/^[0-9]$/.test(e.key)) {
        handleKeyPress(e.key);
      }
      // Backspace/Delete
      if (e.key === "Backspace" || e.key === "Delete") {
        handleDelete();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedStaff, pin.length, isSubmitting]); // hooks into handleKeyPress/handleDelete dependencies

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-linear-to-br from-gray-900/60 to-gray-800/80 backdrop-blur-xl">
      <div className="m-auto w-full max-w-sm px-4">
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-gray-100 min-h-[500px] flex flex-col relative overflow-hidden"
        >
          {/* Background accent */}
          <div className="absolute top-0 left-0 right-0 h-32 bg-linear-to-b from-indigo-50/50 to-transparent pointer-events-none" />

          {/* Header icon */}
          <div className="flex justify-center mb-6 relative">
            <AnimatePresence>
              {selectedStaff && (
                <motion.button
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onClick={() => { setSelectedStaff(null); setPin(""); setIsError(false); }}
                  className="absolute left-0 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-900 transition-colors z-20 bg-white rounded-full hover:bg-gray-50"
                >
                  <ChevronLeft className="w-6 h-6" />
                </motion.button>
              )}
            </AnimatePresence>
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xl shadow-indigo-100 relative z-10">
              <Shield className="w-8 h-8" />
            </div>
          </div>

          <AnimatePresence mode="wait">
            {!selectedStaff ? (
              /* ── STEP 1: SELECT ACCOUNT ── */
              <motion.div
                key="select-user"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex-1 flex flex-col"
              >
                <div className="text-center mb-8">
                  <h1 className="text-2xl font-black text-gray-900 tracking-tight">Sarovar Palace</h1>
                  <p className="text-sm font-semibold text-gray-400 mt-1 uppercase tracking-widest">Select Account</p>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 px-1 custom-scrollbar max-h-[260px] relative z-10">
                  {staffList.length === 0 ? (
                    <p className="text-center text-gray-400 text-sm py-4">No active staff found.</p>
                  ) : (
                    staffList.map((staff) => (
                      <button
                        key={staff._id}
                        onClick={() => {
                          if (staff.isLocked) {
                            toast.error("This account is temporarily locked due to too many failed attempts.");
                            return;
                          }
                          setSelectedStaff(staff);
                          setPin("");
                          setIsError(false);
                        }}
                        disabled={staff.isLocked}
                        className="w-full flex items-center gap-4 p-4 rounded-2xl border border-gray-100 bg-white hover:bg-indigo-50 hover:border-indigo-200 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 text-left group disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {staff.isLocked
                          ? <Lock className="w-9 h-9 text-rose-400 shrink-0" />
                          : <UserCircle2 className="w-10 h-10 text-gray-300 group-hover:text-indigo-500 transition-colors shrink-0" />
                        }
                        <div>
                          <h3 className="font-bold text-gray-900 group-hover:text-indigo-900">{staff.name}</h3>
                          <span className={`text-[10px] font-bold uppercase tracking-widest ${staff.isLocked ? "text-rose-400" : "text-gray-400 group-hover:text-indigo-400"}`}>
                            {staff.isLocked ? "Locked · Too many attempts" : staff.role}
                          </span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </motion.div>
            ) : (
              /* ── STEP 2: ENTER PIN ── */
              <motion.div
                key="enter-pin"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 flex flex-col"
              >
                <div className="text-center mb-6 relative z-10">
                  <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none mb-1">
                    {selectedStaff.name}
                  </h1>
                  <p className="text-sm font-semibold text-gray-400 uppercase tracking-widest">
                    Enter 4-Digit PIN
                  </p>
                </div>

                {/* PIN dots — shake + turn red on wrong PIN */}
                <motion.div
                  key={shakeTrigger}
                  animate={shakeTrigger ? { x: [0, -10, 10, -7, 7, -4, 4, 0] } : {}}
                  transition={{ duration: 0.45 }}
                  className="flex flex-col items-center gap-2 mb-6"
                >
                  <div className="flex justify-center gap-4">
                    {[0, 1, 2, 3].map((i) => (
                      <motion.div
                        key={i}
                        animate={
                          isError
                            ? { scale: [1, 1.2, 1], backgroundColor: "#ef4444", borderColor: "#ef4444" }
                            : pin.length > i
                            ? { scale: [1, 1.2, 1], backgroundColor: "#4f46e5", borderColor: "#4f46e5" }
                            : { scale: 1, backgroundColor: "#ffffff", borderColor: "#e5e7eb" }
                        }
                        transition={{ duration: 0.2 }}
                        className="w-4 h-4 rounded-full border-2"
                      />
                    ))}
                  </div>

                  {/* "Incorrect PIN" fades in below dots on error */}
                  <AnimatePresence>
                    {isError && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.2 }}
                        className="text-xs font-bold text-rose-500 tracking-wide"
                      >
                        Incorrect PIN
                      </motion.p>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Number pad */}
                <div className="grid grid-cols-3 gap-3 mb-2 mt-auto relative z-10">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <Button
                      key={num}
                      variant="outline"
                      disabled={isSubmitting}
                      onClick={() => handleKeyPress(num.toString())}
                      className="h-14 rounded-[1.25rem] text-2xl font-bold text-gray-900 hover:bg-gray-50 hover:text-indigo-600 border-gray-100 shadow-sm transition-all bg-white"
                    >
                      {num}
                    </Button>
                  ))}
                  <Button
                    variant="ghost"
                    disabled={isSubmitting}
                    onClick={handleDelete}
                    className="h-14 rounded-[1.25rem] text-sm font-bold text-gray-400 hover:text-rose-500 hover:bg-rose-50"
                  >
                    DEL
                  </Button>
                  <Button
                    variant="outline"
                    disabled={isSubmitting}
                    onClick={() => handleKeyPress("0")}
                    className="h-14 rounded-[1.25rem] text-2xl font-bold text-gray-900 hover:bg-gray-50 hover:text-indigo-600 border-gray-100 shadow-sm bg-white"
                  >
                    0
                  </Button>
                  <div className="h-14 flex items-center justify-center">
                    {isSubmitting && (
                      <div className="w-5 h-5 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
