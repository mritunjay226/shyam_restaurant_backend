// components/settings/tabs/StaffTab.tsx

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { UserPlus, Lock, ShieldCheck, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { toast } from "sonner";
import { useState } from "react";
import { BASE_ROLES, getRoleColor, ROLE_COLORS } from "../constants/constant";
import { Section } from "./sections";

const inputClass = "rounded-xl border-gray-200 bg-gray-50 focus:bg-white transition-colors text-sm h-10";

interface StaffTabProps {
  token: string | null;
  isAdmin: boolean;
  staffTypes: string[];
  newRoleInput: string;
  onNewRoleInputChange: (val: string) => void;
  onAddRole: (role: string) => void;
  onRemoveRole: (role: string) => void;
}

export function StaffTab({
  token, isAdmin, staffTypes, newRoleInput, onNewRoleInputChange, onAddRole, onRemoveRole,
}: StaffTabProps) {
  const allStaff = useQuery(api.staff.getAllStaff, token ? { token, includeInactive: true } : "skip") || [];
  const createStaff = useMutation(api.staff.createStaff);
  const updateStaff = useMutation(api.staff.updateStaff);
  
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [resetPinState, setResetPinState] = useState<{ id: string; pin: string } | null>(null);

  const [newStaff, setNewStaff] = useState({ name: "", pin: "", role: "kitchen" });

  const handleAddStaff = async () => {
    if (!token) return;
    if (newStaff.pin.length !== 4) return toast.error("PIN must be exactly 4 digits");
    try {
      await createStaff({ token, name: newStaff.name, pin: newStaff.pin, role: newStaff.role, isActive: true });
      toast.success("Staff member added successfully!");
      setNewStaff({ name: "", pin: "", role: "kitchen" });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const allRoles = [...BASE_ROLES, ...staffTypes];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <Section
        title="Staff Role Types"
        description="Add custom roles beyond the defaults (admin, manager, reception, kitchen)."
        icon={ShieldCheck}
      >
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="e.g. housekeeping, accountant, security"
              value={newRoleInput}
              onChange={(e) => onNewRoleInputChange(e.target.value.toLowerCase().replace(/\s+/g, "_"))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newRoleInput.trim()) {
                  onAddRole(newRoleInput.trim());
                }
              }}
              className={inputClass}
            />
            <Button
              onClick={() => onAddRole(newRoleInput.trim())}
              disabled={!newRoleInput.trim()}
              className="h-10 px-4 bg-green-600 hover:bg-green-700 text-white rounded-xl shrink-0"
            >
              <Plus size={16} />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            {BASE_ROLES.map((role) => (
              <span key={role} className={cn("text-xs font-bold px-3 py-1 rounded-full border", getRoleColor(role))}>
                {role} <span className="opacity-50 font-normal">(built-in)</span>
              </span>
            ))}
            {staffTypes.map((role) => (
              <span
                key={role}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border bg-gray-100 text-gray-700 border-gray-200"
              >
                {role}
                <button
                  onClick={() => onRemoveRole(role)}
                  className="text-gray-400 hover:text-rose-500 transition-colors leading-none"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <p className="text-[11px] text-gray-400">Changes take effect after clicking "Save Global Settings".</p>
        </div>
      </Section>

      <Section
        title="Create Staff Access"
        description="Add new staff and their roles to access specific POS registers."
        icon={UserPlus}
      >
        <div className="grid grid-cols-3 gap-4 items-end mb-6">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Staff Name</Label>
            <Input
              placeholder="e.g. Rahul Waiter"
              value={newStaff.name}
              onChange={(e) => setNewStaff((p) => ({ ...p, name: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Role</Label>
            <select
              value={newStaff.role}
              onChange={(e) => setNewStaff((p) => ({ ...p, role: e.target.value }))}
              className={cn("w-full px-3", inputClass)}
            >
              {allRoles.map((r) => (
                <option key={r} value={r} className="capitalize">
                  {r.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">4-Digit PIN</Label>
            <Input
              type="password"
              placeholder="e.g. 1234"
              maxLength={4}
              value={newStaff.pin}
              onChange={(e) => setNewStaff((p) => ({ ...p, pin: e.target.value }))}
              className={inputClass}
            />
          </div>
        </div>
        <Button
          onClick={handleAddStaff}
          disabled={!newStaff.name || newStaff.pin.length !== 4}
          className="w-full bg-indigo-600 text-white rounded-xl h-10 gap-2 hover:bg-indigo-700"
        >
          <UserPlus size={16} /> Add Staff Member
        </Button>
      </Section>

      <Section title="Active Personnel" icon={Lock}>
        <div className="space-y-3">
          {allStaff.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">No staff members configured yet.</p>
          )}
          {allStaff.map((s: any) => (
            <div
              key={s._id}
              className="flex justify-between items-center p-3 rounded-xl border border-gray-100 bg-gray-50/50"
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold",
                    ROLE_COLORS[s.role] || "bg-gray-100 text-gray-600"
                  )}
                >
                  {s.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-gray-900 leading-tight">{s.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{s.role}</p>
                </div>
              </div>
              <div className="flex gap-2 items-center">
                <span
                  className={cn(
                    "text-[10px] uppercase font-bold px-2 py-1 rounded-md",
                    s.isActive ? "bg-green-100 text-green-700" : "bg-rose-100 text-rose-700"
                  )}
                >
                  {s.isActive ? "Active" : "Inactive"}
                </span>
                {isAdmin && token && (
                  <div className="flex items-center gap-1.5">
                    {resetPinState?.id === s._id ? (
                      <div className="flex items-center gap-1.5 animate-in slide-in-from-right-2">
                        <Input
                          type="password"
                          placeholder="New PIN"
                          maxLength={4}
                          value={resetPinState?.pin}
                          onChange={(e) => setResetPinState({ id: s._id, pin: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                          className="h-7 w-20 text-[10px] px-2 rounded-lg bg-white border-indigo-200"
                        />
                        <Button
                          size="sm"
                          disabled={resetPinState?.pin.length !== 4 || isUpdating === s._id}
                          onClick={async () => {
                            setIsUpdating(s._id);
                            try {
                              await updateStaff({ token, staffId: s._id, pin: resetPinState?.pin });
                              toast.success(`PIN updated for ${s.name}`);
                              setResetPinState(null);
                            } catch (e: any) {
                              toast.error(e.message);
                            } finally {
                              setIsUpdating(null);
                            }
                          }}
                          className="h-7 px-2 bg-indigo-600 text-white hover:bg-indigo-700 text-[10px] font-bold rounded-lg"
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setResetPinState(null)}
                          className="h-7 w-7 p-0 text-gray-400 hover:text-gray-600"
                        >
                          <X size={14} />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setResetPinState({ id: s._id, pin: "" })}
                          className="text-[10px] h-7 px-2 rounded-lg font-bold text-indigo-600 hover:bg-indigo-50 flex items-center gap-1"
                        >
                          <Lock size={12} /> Reset PIN
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={isUpdating === s._id}
                          onClick={async () => {
                            setIsUpdating(s._id);
                            try {
                              await updateStaff({ token, staffId: s._id, isActive: !s.isActive });
                              toast.success(`${s.name} ${s.isActive ? "deactivated" : "reactivated"}`);
                            } catch (e: any) {
                              toast.error(e.message);
                            } finally {
                              setIsUpdating(null);
                            }
                          }}
                          className={cn(
                            "text-[10px] h-7 px-2 rounded-lg font-bold transition-all",
                            s.isActive 
                              ? "text-rose-600 hover:bg-rose-50" 
                              : "text-green-600 hover:bg-green-50",
                            isUpdating === s._id && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          {isUpdating === s._id 
                            ? "Wait..." 
                            : s.isActive ? "Deactivate" : "Activate"
                          }
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}