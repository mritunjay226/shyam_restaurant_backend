// app/(dashboard)/settings/page.tsx  ← replaces the original monolithic file

"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { DesktopTopbar } from "@/components/Topbar";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";

import { GeneralTab, type GeneralFormData } from "./_components/generalTab";
import { RoomsTab } from "./_components/roomsTab";
import { BanquetsTab } from "./_components/banquetTab";
import { MenuTab } from "./_components/menuTab";
import { StaffTab } from "./_components/staffTab";
import { PermissionsTab } from "./_components/permissionsTab";
import { BASE_ROLES } from "./constants/constant";

// ─── Tabs config ────────────────────────────────────────────────────────────
const TABS = [
  { id: "general",     label: "General" },
  { id: "staff",       label: "Staff" },
  { id: "permissions", label: "Permissions", adminOnly: true },
  { id: "rooms",       label: "Rooms" },
  { id: "banquets",    label: "Banquets" },
  { id: "menu",        label: "F&B Menu" },
];

const DEFAULT_FORM: GeneralFormData = {
  hotelName: "Shyam Hotel",
  gstin: "09AABCU9603R1ZN",
  address: "1, Mahatma Gandhi Marg, Civil Lines, Prayagraj - 211001",
  email: "admin@shyamhotel.in",
  phone: "+91 98765 43210",
  roomGst: "12",
  foodGst: "5",
  alGst: "18",
  autoCheckoutReminders: true,
  requireIdUpload: false,
  defaultKitchenTab: "restaurant",
  defaultBillingTab: "rooms",
};

export default function SettingsPage() {
  const { token, staff: currentStaff } = useAuth();
  const isAdmin = currentStaff?.role === "admin";

  // ── Convex queries / mutations ──────────────────────────────────────────
  const currentSettings = useQuery(api.settings.getHotelSettings);
  const updateSettings   = useMutation(api.settings.updateHotelSettings);
  const roleConfigs      = useQuery(api.auth.getRolePermissions) || [];
  const updateRolePerms  = useMutation(api.auth.updateRolePermissions);

  // ── Local UI state ──────────────────────────────────────────────────────
  const [activeTab,  setActiveTab]  = useState("general");
  const [isSaving,   setIsSaving]   = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [formData,   setFormData]   = useState<GeneralFormData>(DEFAULT_FORM);
  const [staffTypes, setStaffTypes] = useState<string[]>([]);
  const [newRoleInput, setNewRoleInput] = useState("");

  const [permissionDraft, setPermissionDraft] = useState<Record<string, string[]>>({});
  const [savingRole, setSavingRole] = useState<string | null>(null);

  // ── Hydrate from Convex ─────────────────────────────────────────────────
  useEffect(() => {
    if (!currentSettings) return;
    setFormData((prev) => ({
      ...prev,
      hotelName:              currentSettings.hotelName              || prev.hotelName,
      gstin:                  currentSettings.gstin                  || prev.gstin,
      address:                currentSettings.address                || prev.address,
      email:                  currentSettings.email                  || prev.email,
      phone:                  currentSettings.phone                  || prev.phone,
      roomGst:                currentSettings.roomGst?.toString()    || prev.roomGst,
      foodGst:                currentSettings.foodGst?.toString()    || prev.foodGst,
      alGst:                  currentSettings.alGst?.toString()      || prev.alGst,
      autoCheckoutReminders:  currentSettings.autoCheckoutReminders  ?? prev.autoCheckoutReminders,
      requireIdUpload:        currentSettings.requireIdUpload        ?? prev.requireIdUpload,
      defaultKitchenTab:      currentSettings.defaultKitchenTab      || "restaurant",
      defaultBillingTab:      currentSettings.defaultBillingTab      || "rooms",
    }));
    if (currentSettings.staffTypes) setStaffTypes(currentSettings.staffTypes);
  }, [currentSettings]);

  useEffect(() => {
    if (roleConfigs.length === 0) {
      setPermissionDraft({
        admin:     ["/", "/kitchen", "/restaurant", "/cafe", "/billing", "/rooms", "/banquet", "/reports", "/settings"],
        manager:   ["/", "/kitchen", "/restaurant", "/cafe", "/billing", "/rooms", "/banquet", "/reports"],
        reception: ["/cafe", "/billing", "/rooms"],
        kitchen:   ["/kitchen"],
      });
    } else {
      const draft: Record<string, string[]> = {};
      roleConfigs.forEach((c: any) => { draft[c.role] = [...c.allowedPaths]; });
      setPermissionDraft(draft);
    }
  }, [roleConfigs]);

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setFormData((p) => ({ ...p, [e.target.id]: e.target.value }));

  const handleToggle = (key: keyof GeneralFormData, value: boolean) =>
    setFormData((p) => ({ ...p, [key]: value }));

  const handleSelectChange = (key: keyof GeneralFormData, value: string) =>
    setFormData((p) => ({ ...p, [key]: value }));

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings({
        hotelName:             formData.hotelName,
        gstin:                 formData.gstin,
        address:               formData.address,
        email:                 formData.email,
        phone:                 formData.phone,
        roomGst:               parseFloat(formData.roomGst) || 0,
        foodGst:               parseFloat(formData.foodGst) || 0,
        alGst:                 parseFloat(formData.alGst)   || 0,
        autoCheckoutReminders: formData.autoCheckoutReminders,
        requireIdUpload:       formData.requireIdUpload,
        defaultKitchenTab:     formData.defaultKitchenTab,
        defaultBillingTab:     formData.defaultBillingTab,
        staffTypes,
      });
      toast.success("Settings saved successfully!");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      toast.error("Failed to save: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePath = (role: string, path: string) => {
    if (role === "admin") return;
    setPermissionDraft((prev) => {
      const current = prev[role] || [];
      return {
        ...prev,
        [role]: current.includes(path) ? current.filter((p) => p !== path) : [...current, path],
      };
    });
  };

  const handleSavePermissions = async (role: string) => {
    if (!token) return;
    setSavingRole(role);
    try {
      await updateRolePerms({ token, role, allowedPaths: permissionDraft[role] || [] });
      toast.success(`Permissions for "${role}" saved!`);
    } catch (e: any) {
      toast.error(e.message || "Failed to save permissions");
    } finally {
      setSavingRole(null);
    }
  };

  const handleAddRole = (role: string) => {
    if (role && !staffTypes.includes(role) && !BASE_ROLES.includes(role as any)) {
      setStaffTypes((p) => [...p, role]);
      setNewRoleInput("");
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-full">
      <DesktopTopbar title="Settings" />

      <div className="p-4 sm:p-5 lg:p-6 max-w-4xl mx-auto w-full pb-28 lg:pb-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">System Configuration</h1>
          <p className="text-sm text-gray-500 mt-1 wrap-break-words">
            Manage global preferences, taxation, and inventory databases.
          </p>
        </div>

        {/* Tab bar */}
        <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-100 pb-px">
          {TABS.filter((t) => !t.adminOnly || isAdmin).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-all border-b-2",
                activeTab === tab.id
                  ? "border-green-600 text-green-700"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="w-full max-w-3xl">
          {activeTab === "general" && (
            <GeneralTab
              formData={formData}
              isSaving={isSaving}
              saved={saved}
              onChange={handleChange}
              onToggle={handleToggle}
              onSelectChange={handleSelectChange}
              onSave={handleSave}
            />
          )}
          {activeTab === "rooms"    && <RoomsTab />}
          {activeTab === "banquets" && <BanquetsTab />}
          {activeTab === "menu"     && <MenuTab />}
          {activeTab === "staff" && (
            <StaffTab
              token={token}
              isAdmin={isAdmin}
              staffTypes={staffTypes}
              newRoleInput={newRoleInput}
              onNewRoleInputChange={setNewRoleInput}
              onAddRole={handleAddRole}
              onRemoveRole={(role) => setStaffTypes((p) => p.filter((r) => r !== role))}
            />
          )}
          {activeTab === "permissions" && isAdmin && (
            <PermissionsTab
              staffTypes={staffTypes}
              permissionDraft={permissionDraft}
              savingRole={savingRole}
              onTogglePath={handleTogglePath}
              onSavePermissions={handleSavePermissions}
            />
          )}
        </div>
      </div>
    </div>
  );
}