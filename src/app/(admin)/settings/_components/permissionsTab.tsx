// components/settings/tabs/PermissionsTab.tsx

import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { ALL_PAGES, BASE_ROLES, getRoleColor } from "../constants/constant";
import { Section } from "./sections";

interface PermissionsTabProps {
  staffTypes: string[];
  permissionDraft: Record<string, string[]>;
  savingRole: string | null;
  onTogglePath: (role: string, path: string) => void;
  onSavePermissions: (role: string) => void;
}

export function PermissionsTab({
  staffTypes, permissionDraft, savingRole, onTogglePath, onSavePermissions,
}: PermissionsTabProps) {
  const allRoles = [...BASE_ROLES, ...staffTypes];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <Section
        title="Role-Based Access Control"
        description="Configure which pages each staff role can access. Changes take effect immediately on next login."
        icon={ShieldCheck}
      >
        <div className="space-y-6">
          {allRoles.map((role) => (
            <div key={role} className="rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <span className={cn("text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border", getRoleColor(role))}>
                    {role}
                  </span>
                  {role === "admin" && (
                    <span className="text-xs text-gray-400">Full access — cannot be restricted</span>
                  )}
                </div>
                {role !== "admin" && (
                  <Button
                    size="sm"
                    onClick={() => onSavePermissions(role)}
                    disabled={savingRole === role}
                    className="h-8 px-4 rounded-xl text-xs font-bold bg-green-600 hover:bg-green-700 text-white"
                  >
                    {savingRole === role ? "Saving…" : "Save"}
                  </Button>
                )}
              </div>
              <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {ALL_PAGES.map((page) => {
                  const isChecked = role === "admin" || (permissionDraft[role] || []).includes(page.href);
                  return (
                    <label
                      key={page.href}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all select-none",
                        role === "admin"
                          ? "opacity-60 cursor-not-allowed bg-gray-50 border-gray-100"
                          : isChecked
                          ? "bg-green-50 border-green-200"
                          : "bg-white border-gray-100 hover:bg-gray-50"
                      )}
                      onClick={() => onTogglePath(role, page.href)}
                    >
                      <div
                        className={cn(
                          "w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors",
                          isChecked ? "bg-green-600 border-green-600" : "border-gray-300 bg-white"
                        )}
                      >
                        {isChecked && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className="text-sm font-medium text-gray-700">{page.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}