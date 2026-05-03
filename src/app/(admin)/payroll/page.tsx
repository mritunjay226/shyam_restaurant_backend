"use client";

import { useState, useEffect } from "react";
import { format, subMonths } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { 
  Wallet, TrendingUp, Users, ArrowUpRight, ArrowDownRight, 
  Search, Filter, Banknote, CreditCard, Smartphone, 
  Printer, History, Plus, Loader2, Save, Edit3, X, IndianRupee,
  CheckCircle2, ChevronRight, Calendar, ArrowLeft, MoreHorizontal,
  Building2, ShoppingBag, Receipt
} from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { DesktopTopbar } from "@/components/Topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useAuth } from "@/providers/AuthProvider";
import { cn } from "@/lib/utils";

import { StatCard } from "@/components/StatCard";
import { printReceipt } from "@/lib/print";

const PAYMENT_METHODS = [
  { id: "cash", label: "Cash", icon: Banknote },
  { id: "upi",  label: "UPI",  icon: Smartphone },
  { id: "card", label: "Bank Transfer", icon: CreditCard },
];

export default function PayrollPage() {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [search, setSearch] = useState("");
  const { token: sessionToken } = useAuth();

  const [selectedStaff, setSelectedStaff] = useState<any | null>(null);

  // Queries
  const ledgerSnapshot = useQuery(api.salary.getMonthlyPayrollSnapshot, sessionToken ? { token: sessionToken, month: selectedMonth } : "skip");
  
  const filteredLedger = ledgerSnapshot?.filter(l => 
    l.name.toLowerCase().includes(search.toLowerCase()) || 
    l.role.toLowerCase().includes(search.toLowerCase())
  );

  const totalPayout = filteredLedger?.reduce((sum, l) => sum + l.netPay, 0) || 0;
  const totalPaid = filteredLedger?.filter(l => l.status === "paid").reduce((sum, l) => sum + (l.paymentInfo?.netAmount || 0), 0) || 0;

  const months = Array.from({ length: 6 }).map((_, i) => subMonths(new Date(), i));

  return (
    <div className="flex flex-col min-h-screen bg-gray-50/50">
      <DesktopTopbar title="Payroll & Salary Ledger" />

      <main className="flex-1 flex flex-col p-4 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
        
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
          <StatCard 
            label="Projected Payout" 
            value={totalPayout} 
            prefix="₹"
            icon={Wallet} 
            iconBg="#EDE9FE" 
            iconColor="#7C3AED" 
            sparkColor="#7C3AED"
            sparkData={[12000, 15000, 11000, 18000]}
            delay={0.05}
          />
          <StatCard 
            label="Total Settle Paid" 
            value={totalPaid} 
            prefix="₹"
            icon={CheckCircle2} 
            iconBg="#DCFCE7" 
            iconColor="#16A34A" 
            sparkColor="#16A34A"
            sparkData={[8000, 10000, 9000, 14000]}
            delay={0.10}
          />
          <StatCard 
            label="Pending Amount" 
            value={totalPayout - totalPaid} 
            prefix="₹"
            icon={History} 
            iconBg="#FEF3C7" 
            iconColor="#D97706" 
            sparkColor="#D97706"
            sparkData={[4000, 5000, 2000, 4000]}
            delay={0.15}
          />
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100 shrink-0">
          <div className="flex-1 flex items-center gap-3 bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-100 w-full">
            <Search className="text-gray-400" size={18} />
            <input 
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search staff by name or role..." 
              className="bg-transparent outline-none text-sm font-black w-full text-gray-900 placeholder:text-gray-400 uppercase tracking-widest"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
             <Label className="text-[10px] font-black text-gray-400 uppercase hidden sm:block tracking-widest">Month:</Label>
             <select 
               value={selectedMonth}
               onChange={e => setSelectedMonth(e.target.value)}
               className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-[10px] font-black text-gray-700 outline-none focus:ring-2 focus:ring-violet-500/20 uppercase tracking-widest"
             >
               {months.map(m => (
                 <option key={format(m, "yyyy-MM")} value={format(m, "yyyy-MM")}>
                   {format(m, "MMMM yyyy")}
                 </option>
               ))}
             </select>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col">
          <div className="w-full overflow-x-auto scrollbar-hide">
            <table className="w-full text-left border-separate border-spacing-0">
              <thead>
                <tr className="bg-gray-50/80 backdrop-blur-md sticky top-[64px] z-10">
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest border-b border-gray-100 bg-gray-50/80 backdrop-blur-md">Staff Details</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest border-b border-gray-100 bg-gray-50/80 backdrop-blur-md">Attendance</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest border-b border-gray-100 bg-gray-50/80 backdrop-blur-md">Salary Baseline</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest border-b border-gray-100 bg-gray-50/80 backdrop-blur-md">Pending Adv.</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest border-b border-gray-100 bg-gray-50/80 backdrop-blur-md">Net Final Pay</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest border-b border-gray-100 bg-gray-50/80 backdrop-blur-md">Status</th>
                  <th className="px-6 py-4 text-right border-b border-gray-100 bg-gray-50/80 backdrop-blur-md"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {!ledgerSnapshot ? (
                  <tr>
                    <td colSpan={7} className="py-20 text-center">
                      <Loader2 className="animate-spin mx-auto text-violet-600 mb-2" size={32} />
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Loading payroll records...</p>
                    </td>
                  </tr>
                ) : filteredLedger?.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-20 text-center text-gray-400 font-black text-[10px] uppercase tracking-widest italic">No personnel records found.</td>
                  </tr>
                ) : (
                  filteredLedger?.map(row => (
                    <tr 
                      key={row.staffId} 
                      onClick={() => setSelectedStaff(row)}
                      className="hover:bg-gray-50/50 transition-colors group cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={row.name} size="md" />
                          <div>
                            <p className="font-bold text-gray-900 leading-tight">{row.name}</p>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">{row.role.replace("_", " ")}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="px-2 py-0.5 rounded-lg bg-gray-100 text-gray-500 font-black tabular-nums text-[10px] w-fit">
                            {row.workedDays} / 30 d
                          </span>
                          {row.paidLeavesTaken > 0 && (
                            <span className="px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-600 font-black tabular-nums text-[9px] w-fit">
                              {row.effectivePaidLeaves} Paid Leaves
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-black text-gray-600 tabular-nums">₹{row.baseSalary.toLocaleString()}</span>
                      </td>
                      <td className="px-6 py-4">
                         <span className={cn("text-xs font-black tabular-nums", row.pendingAdvances > 0 ? "text-rose-600" : "text-gray-300")}>
                          ₹{row.pendingAdvances.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 leading-none">
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-violet-50 text-violet-700 rounded-full text-[11px] font-black tabular-nums border border-violet-100/50 shadow-sm">
                           ₹{row.netPay.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {row.status === "paid" ? (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-green-100 text-green-700 font-black text-[9px] uppercase tracking-widest">
                            <CheckCircle2 size={12} className="shrink-0" /> Paid
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-amber-100 text-amber-700 font-black text-[9px] uppercase tracking-widest">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" /> Pending
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity rounded-xl hover:bg-white hover:shadow-sm text-violet-600 font-black text-[10px] uppercase tracking-widest">
                          Ledger <ChevronRight size={14} />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {/* Mobile Nav Spacer */}
            <div className="h-24 lg:h-8 shrink-0" />
          </div>
        </div>
      </main>

      {/* Staff Ledger Slide-in */}
      <AnimatePresence>
        {selectedStaff && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedStaff(null)}
              className="fixed inset-0 bg-gray-900/10 backdrop-blur-xs z-40 transition-all"
            />
            <StaffLedgerSheet 
              staff={selectedStaff} 
              month={selectedMonth}
              onClose={() => setSelectedStaff(null)} 
            />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Staff Ledger Component ───────────────────────────────────────

function StaffLedgerSheet({ staff, month, onClose }: { staff: any; month: string; onClose: () => void }) {
  const { token } = useAuth();
  
  // Queries
  const history = useQuery(api.salary.getStaffFinancialHistory, token ? { token, staffId: staff.staffId } : "skip");
  const fullStaffDetails = useQuery(api.staff.getStaffById, token ? { token, staffId: staff.staffId } : "skip");
  
  // Mutations
  const updateSalary = useMutation(api.salary.updateStaffSalaryInfo);
  const recordAdvance = useMutation(api.salary.recordStaffAdvance);
  const processPayment = useMutation(api.salary.processSalaryPayment);

  const [activeTab, setActiveTab] = useState("ledger");
  const [modalMode, setModalMode] = useState<'edit' | 'advance' | 'disburse' | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formValues, setFormValues] = useState({
    baseSalary: staff.baseSalary,
    accountNo: fullStaffDetails?.accountNo || "",
    ifsc: fullStaffDetails?.ifsc || "",
    upiId: fullStaffDetails?.upiId || "",
    method: (fullStaffDetails?.upiId ? 'upi' : 'bank') as 'bank' | 'upi',
    paidLeavesPerMonth: staff.totalPaidLeavesAllowed || 2,
    advanceAmount: "",
    advanceReason: ""
  });

  // Printing
  const [viewingSlip, setViewingSlip] = useState<any | null>(null);

  // Sync form values when details load
  useEffect(() => {
    if (fullStaffDetails) {
      setFormValues(prev => ({
        ...prev,
        baseSalary: fullStaffDetails.baseSalary ?? staff.baseSalary,
        accountNo: fullStaffDetails.accountNo || "",
        ifsc: fullStaffDetails.ifsc || "",
        upiId: fullStaffDetails.upiId || "",
        method: fullStaffDetails.upiId ? 'upi' : 'bank',
        paidLeavesPerMonth: fullStaffDetails.paidLeavesPerMonth ?? staff.totalPaidLeavesAllowed ?? 2,
      }));
    }
  }, [fullStaffDetails]);

  const handleUpdateFinancials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setIsSubmitting(true);
    try {
      await updateSalary({
        token,
        staffId: staff.staffId,
        baseSalary: Number(formValues.baseSalary),
        accountNo: formValues.accountNo,
        ifsc: formValues.ifsc,
        upiId: formValues.upiId,
        paidLeavesPerMonth: Number(formValues.paidLeavesPerMonth),
      });
      toast.success("Financial profile updated");
      setModalMode(null);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddAdvance = async () => {
    if (!token || !formValues.advanceAmount) return;
    setIsSubmitting(true);
    try {
      await recordAdvance({
        token,
        staffId: staff.staffId,
        amount: parseInt(formValues.advanceAmount),
        reason: formValues.advanceReason,
        date: format(new Date(), "yyyy-MM-dd"),
      });
      toast.success("Advance recorded");
      setModalMode(null);
      setFormValues({ ...formValues, advanceAmount: "", advanceReason: "" });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisburse = async () => {
     if (!token) return;
     setIsSubmitting(true);
     try {
       await processPayment({
         token,
         staffId: staff.staffId,
         month: month,
         baseSalary: staff.baseSalary,
         workedDays: staff.workedDays,
         earnings: staff.earnings,
         deductions: 0,
         paymentMethod: formValues.method,
       });
       toast.success("Salary disbursed successfully");
       setModalMode(null);
       onClose(); // Refresh parent
     } catch (e: any) {
       toast.error(e.message);
     } finally {
       setIsSubmitting(false);
     }
  };

  return (
    <motion.div
      initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 28, stiffness: 280 }}
      className="fixed inset-y-0 right-0 w-full sm:w-[500px] md:w-[580px] bg-white z-50 flex flex-col shadow-xl border-l border-gray-100"
    >
      {/* Header Profile */}
      <div className="shrink-0 bg-gray-50/20 p-6 border-b border-gray-100 relative">
        <button onClick={onClose} className="absolute right-6 top-6 w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-900 transition-colors shadow-sm active:scale-95">
          <X size={18} />
        </button>

        <div className="flex items-center gap-5 mt-4">
          <Avatar name={staff.name} size="xl" />
          <div className="flex-1 min-w-0">
             <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black text-gray-900 leading-none truncate">{staff.name}</h2>
                <div className="px-2 py-1 rounded-lg bg-violet-50 text-violet-700 text-[9px] font-black uppercase tracking-widest shrink-0 border border-violet-100/50">
                  {staff.role.replace("_", " ")}
                </div>
             </div>
             <p className="text-[10px] font-black text-gray-400 mt-2 uppercase tracking-widest flex items-center gap-2">
                <Calendar size={12} className="text-violet-400" /> Joined · {fullStaffDetails?.joiningDate || 'N/A'}
             </p>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-3 gap-3 mt-8">
           <div className="bg-white rounded-2xl p-4 border border-gray-100 text-center shadow-sm">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Base Salary</p>
              <p className="text-md font-black text-gray-900 tabular-nums">₹{staff.baseSalary.toLocaleString()}</p>
              <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">₹{staff.dailyRate}/day</p>
           </div>
           <div className="bg-white rounded-2xl p-4 border border-gray-100 text-center shadow-sm">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Attendance</p>
              <p className="text-md font-black text-gray-900 tabular-nums">{staff.workedDays}d</p>
              <p className="text-[8px] font-bold text-indigo-500 uppercase tracking-tighter">{staff.effectivePaidLeaves} Paid Leaves</p>
           </div>
           <div className="bg-white rounded-2xl p-4 border border-gray-100 text-center shadow-sm">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Net Payable</p>
              <p className="text-md font-black text-green-600 tabular-nums">₹{staff.netPay.toLocaleString()}</p>
              <p className="text-[8px] font-bold text-rose-500 uppercase tracking-tighter">-₹{staff.unpaidDeductions} Unpaid</p>
           </div>
        </div>
      </div>

      {/* History Tabs */}
      <Tabs defaultValue="ledger" value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 border-b bg-white">
          <TabsList className="h-14 bg-transparent gap-8 p-0">
             <TabsTrigger value="ledger" className="h-full bg-transparent border-b-2 border-transparent data-[state=active]:border-violet-600 data-[state=active]:text-violet-600 rounded-none font-black text-[10px] uppercase tracking-widest gap-2">
                <History size={14} /> Transaction Ledger
             </TabsTrigger>
             <TabsTrigger value="details" className="h-full bg-transparent border-b-2 border-transparent data-[state=active]:border-violet-600 data-[state=active]:text-violet-600 rounded-none font-black text-[10px] uppercase tracking-widest gap-2">
                <Receipt size={14} /> Disbursement Info
             </TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="flex-1 bg-gray-50/10">
           <div className="p-6">
              <TabsContent value="ledger" className="m-0 space-y-4 outline-none">
                 {!history ? (
                    <div className="py-12 flex flex-col items-center gap-3 text-gray-300">
                       <Loader2 className="animate-spin" size={32} />
                       <p className="text-[10px] font-black uppercase tracking-widest">Compiling history...</p>
                    </div>
                 ) : history.length === 0 ? (
                    <div className="py-20 text-center border-2 border-dashed border-gray-100 rounded-2xl">
                       <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">No financial history recorded.</p>
                    </div>
                 ) : (
                    history.map((item: any) => (
                       <div key={item._id} className="relative pl-8 before:absolute before:left-[11px] before:top-0 before:bottom-0 before:w-px before:bg-gray-100 last:before:bottom-6">
                          <div className={cn(
                            "absolute left-0 top-1 w-6 h-6 rounded-lg border-2 border-white flex items-center justify-center shadow-sm z-10",
                            item.type === 'payment' ? "bg-green-500 text-white" : "bg-rose-500 text-white"
                          )}>
                             {item.type === 'payment' ? <Banknote size={10} /> : <Plus size={10} />}
                          </div>
                          
                          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-start justify-between gap-4 group">
                             <div className="min-w-0">
                                <p className="text-[11px] font-black text-gray-900 uppercase tracking-tight">
                                   {item.type === 'payment' ? `Monthly Salary - ${item.month}` : `Cash Advance`}
                                </p>
                                <p className="text-[9px] font-black text-gray-400 mt-0.5 flex items-center gap-1.5 uppercase tracking-widest">
                                   <Calendar size={10} className="text-gray-300" /> {item.date || item.paymentDate}
                                </p>
                                {item.reason && (
                                   <p className="text-[9px] text-violet-600 font-bold mt-2 bg-violet-50 w-fit px-2 py-0.5 rounded-md border border-violet-100/50">
                                      {item.reason}
                                   </p>
                                )}
                             </div>
                             <div className="text-right shrink-0">
                                <p className={cn("text-xs font-black tabular-nums", item.type === 'payment' ? "text-green-600" : "text-rose-600")}>
                                   {item.type === 'payment' ? '+' : '-'} ₹{(item.netAmount ?? item.amount ?? 0).toLocaleString()}
                                </p>
                                {item.type === 'payment' && (
                                   <button 
                                      onClick={() => setViewingSlip({...item, ...staff})}
                                      className="text-[9px] font-black text-violet-600 uppercase tracking-widest hover:underline mt-1 active:scale-95 transition-transform"
                                   >
                                      Print Slip
                                   </button>
                                )}
                             </div>
                          </div>
                       </div>
                    ))
                 )}
              </TabsContent>

              <TabsContent value="details" className="m-0 outline-none space-y-6">
                 <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-6">
                    <div className="flex items-center justify-between">
                       <h4 className="text-[9px] font-black uppercase tracking-widest text-gray-400">Baseline Settings</h4>
                       <Button variant="ghost" size="sm" onClick={() => setModalMode('edit')} className="h-8 rounded-xl text-violet-600 font-black text-[9px] uppercase tracking-widest gap-1.5 hover:bg-violet-50">
                          <Edit3 size={11} /> Update Profile
                       </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-y-6">
                       <div className="space-y-1">
                          <p className="text-[9px] font-black text-violet-600/60 uppercase tracking-widest leading-none">Salary / Month</p>
                          <p className="text-md font-black text-gray-900 tabular-nums">₹{staff.baseSalary.toLocaleString()}</p>
                          <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">Rate: ₹{staff.dailyRate}/day</p>
                       </div>
                       <div className="space-y-1">
                          <p className="text-[9px] font-black text-violet-600/60 uppercase tracking-widest leading-none">Paid Leave Limit</p>
                          <p className="text-md font-black text-gray-900 uppercase tracking-widest">{staff.totalPaidLeavesAllowed} Days <span className="text-[9px] text-gray-400">/ Month</span></p>
                       </div>
                       <div className="space-y-1 mt-4">
                          <p className="text-[9px] font-black text-violet-600/60 uppercase tracking-widest leading-none">Current Attendance</p>
                          <p className="text-xs font-black text-gray-900 uppercase tracking-widest">
                             {staff.presentDays}P / {staff.halfDays}H / {staff.paidLeavesTaken}L
                          </p>
                       </div>
                       
                       <div className="col-span-2 space-y-4 pt-6 border-t border-gray-50">
                          <p className="text-[9px] font-black text-violet-600/60 uppercase tracking-widest leading-none">Payment Channel</p>
                          <div className="flex items-center gap-4">
                             <div className={cn(
                               "w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0 border",
                               fullStaffDetails?.upiId ? "bg-violet-50 border-violet-100/50 text-violet-600" : "bg-emerald-50 border-emerald-100/50 text-emerald-600"
                             )}>
                                {fullStaffDetails?.upiId ? <Smartphone size={24} /> : <Building2 size={24} />}
                             </div>
                             <div>
                                <p className="font-black text-gray-900 text-xs uppercase tracking-tight">
                                   {fullStaffDetails?.upiId ? 'Digital UPI ID' : 'Traditional Bank Transfer'}
                                </p>
                                <p className="text-[10px] font-black text-gray-400 mt-1 uppercase tracking-widest">
                                   {fullStaffDetails?.upiId ? fullStaffDetails.upiId : `${fullStaffDetails?.accountNo} (${fullStaffDetails?.ifsc})`}
                                </p>
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>
              </TabsContent>
           </div>
        </ScrollArea>

        {/* Action Footer */}
        <div className="shrink-0 p-6 bg-white border-t border-gray-100 grid grid-cols-2 gap-4 shadow-[0_-4px_12px_rgba(0,0,0,0.02)]">
           {staff.status === "paid" ? (
             <div className="col-span-2 p-4 bg-green-50 rounded-2xl border border-green-100/50 flex items-center justify-center gap-2 text-green-700 font-black text-[10px] uppercase tracking-widest">
                <CheckCircle2 size={14} /> Monthly Salary Disbursed
             </div>
           ) : (
             <>
                <Button 
                  onClick={() => setModalMode('advance')}
                  className="h-12 bg-white border border-gray-100 text-rose-600 hover:bg-rose-50 rounded-2xl font-black text-[10px] uppercase tracking-widest gap-2 shadow-sm active:scale-95 transition-all"
                >
                  <Plus size={16} /> Cash Advance
                </Button>
                <Button 
                  onClick={() => setModalMode('disburse')}
                  className="h-12 bg-violet-600 text-white hover:bg-violet-700 rounded-2xl font-black text-[10px] uppercase tracking-widest gap-2 shadow-lg shadow-violet-100 active:scale-95 transition-all"
                >
                  <IndianRupee size={16} /> Settle Pay
                </Button>
             </>
           )}
        </div>
      </Tabs>

      {/* Slide-in Overlays (Sub-modals) */}
      <AnimatePresence>
         {modalMode && (
            <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setModalMode(null)} className="absolute inset-0 bg-gray-900/10 backdrop-blur-xs" />
               <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white rounded-2xl p-8 shadow-2xl w-full max-w-sm space-y-8 border border-gray-100">
                  
                  {/* Modal Header */}
                  <div className="flex items-center justify-between">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-violet-50 border border-violet-100/50 flex items-center justify-center text-violet-600">
                           {modalMode === 'edit' ? <Edit3 size={24} /> : modalMode === 'advance' ? <Plus size={24} /> : <Banknote size={24} />}
                        </div>
                        <div>
                           <h3 className="text-md font-black text-gray-900 leading-tight uppercase tracking-tight">{modalMode === 'disburse' ? 'Process Payment' : modalMode} Profile</h3>
                           <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1 tracking-widest">{staff.name}</p>
                        </div>
                     </div>
                     <button onClick={() => setModalMode(null)} className="text-gray-300 hover:text-gray-900 transition-colors"><X size={20} /></button>
                  </div>

                  {modalMode === 'edit' && (
                     <form onSubmit={handleUpdateFinancials} className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-2">
                              <Label className="text-[9px] font-black uppercase text-gray-400 tracking-widest ml-1">Monthly Base Salary</Label>
                              <Input 
                                 type="number" 
                                 value={formValues.baseSalary}
                                 onChange={e => setFormValues({...formValues, baseSalary: e.target.value})}
                                 className="h-12 rounded-2xl bg-gray-50 border-gray-100 font-black text-xs px-5 focus:ring-violet-500/20" 
                              />
                           </div>
                           <div className="space-y-2">
                              <Label className="text-[9px] font-black uppercase text-gray-400 tracking-widest ml-1">Paid Leaves / Mo</Label>
                              <Input 
                                 type="number" 
                                 value={formValues.paidLeavesPerMonth}
                                 onChange={e => setFormValues({...formValues, paidLeavesPerMonth: e.target.value})}
                                 className="h-12 rounded-2xl bg-gray-50 border-gray-100 font-black text-xs px-5 focus:ring-violet-500/20" 
                              />
                           </div>
                        </div>
                        <div className="space-y-3">
                           <Label className="text-[9px] font-black uppercase text-gray-400 tracking-widest ml-1">Preferred Method</Label>
                           <div className="flex p-1 bg-gray-50 rounded-2xl border border-gray-100">
                             <button type="button" onClick={() => setFormValues({...formValues, method: 'bank'})} className={cn("flex-1 py-2 text-[10px] font-black rounded-xl transition-all uppercase tracking-widest", formValues.method === 'bank' ? "bg-white shadow-sm text-violet-600" : "text-gray-400")}>Bank</button>
                             <button type="button" onClick={() => setFormValues({...formValues, method: 'upi'})} className={cn("flex-1 py-2 text-[10px] font-black rounded-xl transition-all uppercase tracking-widest", formValues.method === 'upi' ? "bg-white shadow-sm text-violet-600" : "text-gray-400")}>UPI</button>
                           </div>
                        </div>

                        {formValues.method === 'bank' ? (
                           <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1">
                              <div className="space-y-2">
                                 <Label className="text-[9px] font-black uppercase text-gray-400 tracking-widest ml-1">A/C No</Label>
                                 <Input value={formValues.accountNo} onChange={e => setFormValues({...formValues, accountNo: e.target.value})} className="h-10 rounded-xl bg-gray-50 border-gray-100 text-[10px] font-black px-4 focus:ring-violet-500/20" />
                              </div>
                              <div className="space-y-2">
                                 <Label className="text-[9px] font-black uppercase text-gray-400 tracking-widest ml-1">IFSC Code</Label>
                                 <Input value={formValues.ifsc} onChange={e => setFormValues({...formValues, ifsc: e.target.value.toUpperCase()})} className="h-10 rounded-xl bg-gray-50 border-gray-100 text-[10px] font-black px-4 focus:ring-violet-500/20" />
                              </div>
                           </div>
                        ) : (
                           <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                              <Label className="text-[9px] font-black uppercase text-gray-400 tracking-widest ml-1">UPI ID</Label>
                              <Input placeholder="example@upi" value={formValues.upiId} onChange={e => setFormValues({...formValues, upiId: e.target.value.toLowerCase()})} className="h-12 rounded-2xl bg-gray-50 border-gray-100 font-black text-xs px-5 focus:ring-violet-500/20" />
                           </div>
                        )}

                        <Button type="submit" disabled={isSubmitting} className="w-full h-14 bg-violet-600 text-white hover:bg-violet-700 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-violet-100 gap-2">
                           {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                           Save Changes
                        </Button>
                     </form>
                  )}

                  {modalMode === 'advance' && (
                     <div className="space-y-6">
                        <div className="space-y-2">
                           <Label className="text-[9px] font-black uppercase text-gray-400 tracking-widest ml-1">Amount (₹)</Label>
                           <Input type="number" value={formValues.advanceAmount} onChange={e => setFormValues({...formValues, advanceAmount: e.target.value})} className="h-12 rounded-2xl bg-gray-50 border-gray-100 font-black text-xs px-5 focus:ring-rose-500/20" placeholder="5000" />
                        </div>
                        <div className="space-y-2">
                           <Label className="text-[9px] font-black uppercase text-gray-400 tracking-widest ml-1">Remarks</Label>
                           <textarea value={formValues.advanceReason} onChange={e => setFormValues({...formValues, advanceReason: e.target.value})} className="w-full h-32 rounded-2xl bg-gray-50 border border-gray-100 p-5 text-xs font-black outline-none focus:ring-2 focus:ring-rose-500/20" placeholder="e.g. Health emergency..." />
                        </div>
                        <Button onClick={handleAddAdvance} disabled={isSubmitting || !formValues.advanceAmount} className="w-full h-14 bg-rose-600 text-white hover:bg-rose-700 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-rose-100 gap-2">
                           {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
                           Record Advance
                        </Button>
                     </div>
                  )}

                  {modalMode === 'disburse' && (
                     <div className="space-y-8">
                        <div className="bg-violet-50/30 rounded-2xl p-6 border border-violet-100/50">
                           <div className="flex justify-between items-end mb-6">
                              <div>
                                 <p className="text-[9px] font-black text-violet-600 uppercase tracking-widest">Final Net Payout</p>
                                 <h2 className="text-3xl font-black text-gray-900 tabular-nums mt-1 leading-none">₹{staff.netPay.toLocaleString()}</h2>
                              </div>
                              <div className="text-right">
                                 <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Cycle</p>
                                 <p className="text-[10px] font-black text-gray-900 uppercase">{format(new Date(month), "MMM yyyy")}</p>
                              </div>
                           </div>
                           
                           <div className="space-y-3 pt-6 border-t border-violet-100/50">
                              <div className="flex justify-between text-[10px] font-black uppercase text-gray-400">
                                 <span>Attendance Rate</span>
                                 <span className="text-gray-900">{staff.workedDays} / 30 D</span>
                              </div>
                              <div className="flex justify-between text-[10px] font-black uppercase text-gray-400">
                                 <span>Advance Recovery</span>
                                 <span className="text-rose-600">- ₹{staff.pendingAdvances.toLocaleString()}</span>
                              </div>
                           </div>
                        </div>

                        <Button onClick={handleDisburse} disabled={isSubmitting} className="w-full h-16 bg-violet-600 text-white hover:bg-violet-700 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-violet-100 gap-3">
                           {isSubmitting ? <Loader2 className="animate-spin" size={24} /> : <CheckCircle2 size={24} />}
                           Disburse Salary
                        </Button>
                        <p className="text-[9px] text-center text-gray-400 font-black uppercase tracking-widest leading-relaxed">Action will automatically reconcile all pending advances for this cycle</p>
                     </div>
                  )}

               </motion.div>
            </div>
         )}

         {/* Original Pay Slip Modal (for printing) */}
         {viewingSlip && (
            <div className="fixed inset-0 z-70 flex items-center justify-center p-4">
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewingSlip(null)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
               <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white rounded-3xl p-8 shadow-2xl w-full max-w-2xl overflow-hidden print:p-0 print:shadow-none print:rounded-none">
                  <div id="payroll-slip" className="space-y-8">
                     <div className="flex justify-between items-start border-b border-gray-100 pb-6">
                        <div>
                           <h2 className="text-2xl font-black text-gray-900 leading-none">Shyam Hotel</h2>
                           <p className="text-sm font-bold text-gray-400 mt-2 uppercase tracking-widest">Employee Pay Slip</p>
                        </div>
                        <div className="text-right">
                           <p className="text-sm font-black text-indigo-600">{viewingSlip.month}</p>
                           <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Settle Date: {viewingSlip.paymentDate || '-'}</p>
                        </div>
                     </div>
                     <div className="grid grid-cols-2 gap-8 text-sm">
                        <div>
                           <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Employee Details</Label>
                           <p className="text-lg font-black text-gray-900 mt-1">{viewingSlip.name}</p>
                           <p className="text-gray-500 font-bold capitalize">{viewingSlip.role.replace("_", " ")}</p>
                        </div>
                        <div className="text-right">
                           <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Payment Details</Label>
                           <p className="text-gray-900 font-bold mt-1 leading-none">{viewingSlip.upiId ? `UPI: ${viewingSlip.upiId}` : `A/C: ${viewingSlip.accountNo || 'N/A'}`}</p>
                        </div>
                     </div>
                     <div className="bg-gray-50 rounded-2xl p-6 grid grid-cols-2 gap-x-12 gap-y-4">
                        <div className="space-y-3">
                           <p className="text-[10px] font-black uppercase text-indigo-600 tracking-widest">Earnings</p>
                           <div className="flex justify-between text-sm"><span className="font-bold text-gray-600">Basic Salary</span><span className="font-black text-gray-900 tabular-nums">₹{viewingSlip.baseSalary.toLocaleString()}</span></div>
                           <div className="flex justify-between text-sm"><span className="font-bold text-gray-600">Worked Days ({viewingSlip.workedDays}/30)</span><span className="font-black text-gray-900 tabular-nums">₹{viewingSlip.earnings.toLocaleString()}</span></div>
                        </div>
                        <div className="space-y-3 border-l border-gray-200 pl-12">
                           <p className="text-[10px] font-black uppercase text-rose-600 tracking-widest">Deductions</p>
                           <div className="flex justify-between text-sm"><span className="font-bold text-gray-600">Advances Recovered</span><span className="font-black text-rose-600 tabular-nums">- ₹{(viewingSlip.advanceRecovered || 0).toLocaleString()}</span></div>
                        </div>
                     </div>
                     <div className="flex justify-between items-center bg-indigo-600 rounded-2xl p-6 text-white">
                        <div><p className="text-[10px] font-black uppercase tracking-widest opacity-70">Net Amount Paid</p><p className="text-xs font-bold opacity-60">Via {viewingSlip.paymentMethod || 'Transfer'}</p></div>
                        <h3 className="text-3xl font-black tabular-nums">₹{viewingSlip.netAmount.toLocaleString()}</h3>
                     </div>
                  </div>
                  <div className="mt-8 flex gap-3 print:hidden">
                     <Button className="flex-1 h-12 bg-gray-900 text-white rounded-xl font-bold gap-2" onClick={() => {
                     const el = document.getElementById("payroll-slip");
                     if (el) printReceipt(el.innerHTML, false);
                   }}><Printer size={18} /> Print Record</Button>
                     <Button variant="ghost" className="flex-1 h-12 text-gray-400 font-bold" onClick={() => setViewingSlip(null)}>Close</Button>
                  </div>
               </motion.div>
            </div>
         )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Utility ─────────────────────────────────────────────────────

function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" | "xl" }) {
  const sizes = { sm: "w-8 h-8 text-[10px]", md: "w-10 h-10 text-xs", lg: "w-14 h-14 text-sm", xl: "w-20 h-20 text-xl" };
  return (
    <div className={cn("rounded-2xl bg-linear-to-br from-indigo-500 to-indigo-700 flex items-center justify-center font-bold text-white shrink-0 shadow-sm", sizes[size])}>
      {name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
    </div>
  );
}
