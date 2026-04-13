"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Save, Building2, Percent, SlidersHorizontal, CheckCircle2, Plus, BedDouble, UtensilsCrossed, LayoutDashboard, Pencil, X, Trash2 } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { DesktopTopbar } from "@/components/Topbar";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";
import { UserPlus, Lock, ShieldCheck } from "lucide-react";
import { ImageUploader, GalleryUploader } from "@/components/ImageUploader";

function Section({ title, description, icon: Icon, children }: {
  title: string; description?: string; icon: React.ElementType; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-5">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
          <Icon size={18} className="text-green-600" />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900">{title}</p>
          {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

const ALL_PAGES = [
  { href: "/", label: "Dashboard" },
  { href: "/rooms", label: "Rooms" },
  { href: "/restaurant", label: "Restaurant" },
  { href: "/cafe", label: "Café" },
  { href: "/kitchen", label: "Kitchen KDS" },
  { href: "/banquet", label: "Banquet & Events" },
  { href: "/billing", label: "Billing" },
  { href: "/reports", label: "Reports" },
  { href: "/settings", label: "Settings" },
];

const BASE_ROLES = ["admin", "manager", "reception", "kitchen"];

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-purple-100 text-purple-700 border-purple-200",
  manager: "bg-blue-100 text-blue-700 border-blue-200",
  reception: "bg-teal-100 text-teal-700 border-teal-200",
  kitchen: "bg-orange-100 text-orange-700 border-orange-200",
};

function getRoleColor(role: string) {
  return ROLE_COLORS[role] || "bg-gray-100 text-gray-700 border-gray-200";
}

export default function SettingsPage() {
  const { token, staff: currentStaff } = useAuth();
  const isAdmin = currentStaff?.role === "admin";
  
  const currentSettings = useQuery(api.settings.getHotelSettings);
  const updateSettings = useMutation(api.settings.updateHotelSettings);
  
  const addRoom = useMutation(api.rooms.addRoom);
  const updateRoom = useMutation(api.rooms.updateRoom);
  const addHall = useMutation(api.banquet.addHall);
  const updateHall = useMutation(api.banquet.updateHall);
  const addMenu = useMutation(api.menuItems.addMenuItem);
  const updateMenuItem = useMutation(api.menuItems.updateMenuItem);

  const allRooms = useQuery(api.rooms.getAllRooms) || [];
  const allHalls = useQuery(api.banquet.getAllHalls) || [];
  const allMenuItems = useQuery(api.menuItems.getAllMenuItems) || [];
  
  const allStaff = useQuery(api.staff.getAllStaff, token ? { token } : "skip") || [];
  const createStaff = useMutation(api.staff.createStaff);
  const updateStaff = useMutation(api.staff.updateStaff);

  const roleConfigs = useQuery(api.auth.getRolePermissions) || [];
  const updateRolePermissions = useMutation(api.auth.updateRolePermissions);

  const [permissionDraft, setPermissionDraft] = useState<Record<string, string[]>>({});
  const [savingRole, setSavingRole] = useState<string | null>(null);

  useEffect(() => {
    if (roleConfigs.length > 0) {
      const draft: Record<string, string[]> = {};
      roleConfigs.forEach((c: any) => { draft[c.role] = [...c.allowedPaths]; });
      setPermissionDraft(draft);
    } else {
      setPermissionDraft({
        admin: ["/", "/kitchen", "/restaurant", "/cafe", "/billing", "/rooms", "/banquet", "/reports", "/settings"],
        manager: ["/", "/kitchen", "/restaurant", "/cafe", "/billing", "/rooms", "/banquet", "/reports"],
        reception: ["/cafe", "/billing", "/rooms"],
        kitchen: ["/kitchen"],
      });
    }
  }, [roleConfigs]);

  const togglePath = (role: string, path: string) => {
    if (role === "admin") return;
    setPermissionDraft(prev => {
      const current = prev[role] || [];
      const has = current.includes(path);
      return { ...prev, [role]: has ? current.filter(p => p !== path) : [...current, path] };
    });
  };

  const handleSavePermissions = async (role: string) => {
    if (!token) return;
    setSavingRole(role);
    try {
      await updateRolePermissions({ token, role, allowedPaths: permissionDraft[role] || [] });
      toast.success(`Permissions for "${role}" saved!`);
    } catch (e: any) {
      toast.error(e.message || "Failed to save permissions");
    } finally {
      setSavingRole(null);
    }
  };

  const [activeTab, setActiveTab] = useState("general");
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [formData, setFormData] = useState({
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
  });

  const [staffTypes, setStaffTypes] = useState<string[]>([]);
  const [newRoleInput, setNewRoleInput] = useState("");

  // ── CREATE states ────────────────────────────────────────────────────────
  const [newRoom, setNewRoom] = useState({ number: "", category: "Standard", floor: "", tariff: "", image: "", images: [] as string[] });
  const [newHall, setNewHall] = useState({ name: "", type: "Indoor", capacity: "", price: "", image: "" });
  const [newMenuItem, setNewMenuItem] = useState({ name: "", category: "Food", subCategory: "Main Course", price: "", outlet: "restaurant", image: "" });
  const [newStaff, setNewStaff] = useState({ name: "", pin: "", role: "kitchen" });

  // ── EDIT states ──────────────────────────────────────────────────────────
  type EditRoom = { _id: any; category: string; tariff: string; description: string; image: string; images: string[]; amenities: string };
  type EditHall = { _id: any; name: string; type: string; capacity: string; price: string; description: string; image: string };
  type EditMenuItem = { _id: any; name: string; category: string; subCategory: string; price: string; outlet: string; image: string };

  const [editRoom, setEditRoom] = useState<EditRoom | null>(null);
  const [editHall, setEditHall] = useState<EditHall | null>(null);
  const [editMenuItem, setEditMenuItem] = useState<EditMenuItem | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  useEffect(() => {
    if (currentSettings) {
      setFormData(prev => ({
        ...prev,
        hotelName: currentSettings.hotelName || prev.hotelName,
        gstin: currentSettings.gstin || prev.gstin,
        address: currentSettings.address || prev.address,
        email: currentSettings.email || prev.email,
        phone: currentSettings.phone || prev.phone,
        roomGst: currentSettings.roomGst?.toString() || prev.roomGst,
        foodGst: currentSettings.foodGst?.toString() || prev.foodGst,
        alGst: currentSettings.alGst?.toString() || prev.alGst,
        autoCheckoutReminders: currentSettings.autoCheckoutReminders ?? prev.autoCheckoutReminders,
        requireIdUpload: currentSettings.requireIdUpload ?? prev.requireIdUpload,
        defaultKitchenTab: currentSettings.defaultKitchenTab || "restaurant",
        defaultBillingTab: currentSettings.defaultBillingTab || "rooms",
      }));
      if (currentSettings.staffTypes) {
        setStaffTypes(currentSettings.staffTypes);
      }
    }
  }, [currentSettings]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(p => ({ ...p, [e.target.id]: e.target.value }));
  };

  const handleAddStaff = async () => {
    if (!token) return;
    if (newStaff.pin.length !== 4) {
      return toast.error("PIN must be exactly 4 digits");
    }
    try {
      await createStaff({
        token,
        name: newStaff.name,
        pin: newStaff.pin,
        role: newStaff.role,
        isActive: true,
      });
      toast.success("Staff member added successfully!");
      setNewStaff({ name: "", pin: "", role: "kitchen" });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings({
        hotelName: formData.hotelName,
        gstin: formData.gstin,
        address: formData.address,
        email: formData.email,
        phone: formData.phone,
        roomGst: parseFloat(formData.roomGst) || 0,
        foodGst: parseFloat(formData.foodGst) || 0,
        alGst: parseFloat(formData.alGst) || 0,
        autoCheckoutReminders: formData.autoCheckoutReminders,
        requireIdUpload: formData.requireIdUpload,
        defaultKitchenTab: formData.defaultKitchenTab,
        defaultBillingTab: formData.defaultBillingTab,
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

  const handleAddRoom = async () => {
    try {
      await addRoom({
        roomNumber: newRoom.number,
        category: newRoom.category.toLowerCase(),
        floor: parseInt(newRoom.floor || "1"),
        tariff: parseInt(newRoom.tariff || "0"),
        ...(newRoom.image && { image: newRoom.image }),
        ...(newRoom.images.length > 0 && { images: newRoom.images }),
      });
      toast.success("Room added successfully!");
      setNewRoom({ number: "", category: "Standard", floor: "", tariff: "", image: "", images: [] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleSaveRoomEdit = async () => {
    if (!editRoom) return;
    setIsSavingEdit(true);
    try {
      await updateRoom({
        roomId: editRoom._id,
        category: editRoom.category.toLowerCase(),
        tariff: parseInt(editRoom.tariff || "0"),
        description: editRoom.description || undefined,
        image: editRoom.image || undefined,
        images: editRoom.images.length > 0 ? editRoom.images : undefined,
        amenities: editRoom.amenities ? editRoom.amenities.split(",").map(s => s.trim()).filter(Boolean) : undefined,
      });
      toast.success("Room updated!");
      setEditRoom(null);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleAddHall = async () => {
    try {
      await addHall({
        name: newHall.name,
        type: newHall.type,
        capacity: parseInt(newHall.capacity || "100"),
        price: parseInt(newHall.price || "0"),
        ...(newHall.image && { image: newHall.image })
      });
      toast.success("Banquet Hall added successfully!");
      setNewHall({ name: "", type: "Indoor", capacity: "", price: "", image: "" });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleSaveHallEdit = async () => {
    if (!editHall) return;
    setIsSavingEdit(true);
    try {
      await updateHall({
        hallId: editHall._id,
        name: editHall.name,
        type: editHall.type,
        capacity: parseInt(editHall.capacity || "100"),
        price: parseInt(editHall.price || "0"),
        description: editHall.description || undefined,
        image: editHall.image || undefined,
      });
      toast.success("Hall updated!");
      setEditHall(null);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleAddMenu = async () => {
    try {
      await addMenu({
        name: newMenuItem.name,
        category: newMenuItem.category,
        subCategory: newMenuItem.subCategory,
        price: parseInt(newMenuItem.price || "0"),
        outlet: newMenuItem.outlet,
        ...(newMenuItem.image && { image: newMenuItem.image })
      });
      toast.success("Menu item added successfully!");
      setNewMenuItem({ name: "", category: "Food", subCategory: "Main Course", price: "", outlet: "restaurant", image: "" });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleSaveMenuEdit = async () => {
    if (!editMenuItem) return;
    setIsSavingEdit(true);
    try {
      await updateMenuItem({
        menuItemId: editMenuItem._id,
        name: editMenuItem.name,
        category: editMenuItem.category,
        subCategory: editMenuItem.subCategory,
        price: parseInt(editMenuItem.price || "0"),
        image: editMenuItem.image || undefined,
      });
      toast.success("Menu item updated!");
      setEditMenuItem(null);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const inputClass = "rounded-xl border-gray-200 bg-gray-50 focus:bg-white transition-colors text-sm h-10";

  const tabs = [
    { id: "general", label: "General" },
    { id: "staff", label: "Staff" },
    { id: "permissions", label: "Permissions", adminOnly: true },
    { id: "rooms", label: "Rooms" },
    { id: "banquets", label: "Banquets" },
    { id: "menu", label: "F&B Menu" }
  ];


  return (
    <div className="flex flex-col min-h-full">
      <DesktopTopbar title="Settings" />

      <div className="p-4 sm:p-5 lg:p-6 max-w-4xl mx-auto w-full pb-28 lg:pb-6 overflow-x-hidden">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">System Configuration</h1>
          <p className="text-sm text-gray-500 mt-1">Manage global preferences, taxation, and inventory databases.</p>
        </div>

        <div className="flex overflow-x-auto hide-scrollbar gap-2 mb-6 border-b border-gray-100 pb-px">
          {tabs.filter(t => !t.adminOnly || isAdmin).map((tab) => (
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

        <div className="w-full max-w-3xl">
          {activeTab === "general" && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <Section title="Hotel Profile" description="This information appears on all guest invoices." icon={Building2}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="hotelName" className="text-xs font-semibold text-gray-600">Business Name</Label>
                    <Input id="hotelName" value={formData.hotelName} onChange={handleChange} className={inputClass} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="gstin" className="text-xs font-semibold text-gray-600">GSTIN Number</Label>
                    <Input id="gstin" value={formData.gstin} onChange={handleChange} className={inputClass} />
                  </div>
                </div>
                <div className="mt-4 space-y-1.5">
                  <Label htmlFor="address" className="text-xs font-semibold text-gray-600">Registered Address</Label>
                  <textarea
                    id="address"
                    value={formData.address}
                    onChange={handleChange}
                    rows={3}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 focus:bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500/20 resize-none transition-colors"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-semibold text-gray-600">Contact Email</Label>
                    <Input id="email" type="email" value={formData.email} onChange={handleChange} className={inputClass} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-xs font-semibold text-gray-600">Contact Phone</Label>
                    <Input id="phone" type="tel" value={formData.phone} onChange={handleChange} className={inputClass} />
                  </div>
                </div>
              </Section>

              <Section title="Default Tax Rates" description="Configure standard GST percentages." icon={Percent}>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { id: "roomGst", label: "Room GST (%)" },
                    { id: "foodGst", label: "Food GST (%)" },
                    { id: "alGst",  label: "Admin / Ext GST (%)" },
                  ].map(f => (
                    <div key={f.id} className="space-y-1.5">
                      <Label htmlFor={f.id} className="text-xs font-semibold text-gray-600">{f.label}</Label>
                      <Input id={f.id} type="number" value={(formData as any)[f.id]} onChange={handleChange} className={cn(inputClass, "tabular-nums")} />
                    </div>
                  ))}
                </div>
              </Section>

              <Section title="System Preferences" icon={SlidersHorizontal}>
                <div className="space-y-4">
                  {[
                    { key: "autoCheckoutReminders", label: "Auto Checkout Reminders", desc: "Highlight rooms due for checkout today in amber." },
                    { key: "requireIdUpload", label: "Require Guest ID Upload", desc: "Make ID photo attachment mandatory during check-in." }
                  ].map((pref, i) => (
                    <div key={pref.key} className={cn("flex items-center justify-between", i > 0 && "pt-4 border-t border-gray-100")}>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{pref.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{pref.desc}</p>
                      </div>
                      <Switch checked={(formData as any)[pref.key]} onCheckedChange={(c: boolean) => setFormData(p => ({ ...p, [pref.key]: c }))} />
                    </div>
                  ))}

                  {/* Default Tab Settings */}
                  <div className="pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-gray-700">Default Kitchen KDS Tab</Label>
                      <select
                        value={formData.defaultKitchenTab}
                        onChange={e => setFormData(p => ({ ...p, defaultKitchenTab: e.target.value }))}
                        className={cn("w-full px-3", inputClass)}
                      >
                        <option value="restaurant">Restaurant</option>
                        <option value="cafe">Café</option>
                      </select>
                      <p className="text-[11px] text-gray-400">Which outlet opens by default in the KDS.</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-gray-700">Default Billing Tab</Label>
                      <select
                        value={formData.defaultBillingTab}
                        onChange={e => setFormData(p => ({ ...p, defaultBillingTab: e.target.value }))}
                        className={cn("w-full px-3", inputClass)}
                      >
                        <option value="rooms">Room Folios</option>
                        <option value="tables">Table Bills</option>
                      </select>
                      <p className="text-[11px] text-gray-400">Which section opens by default in Billing.</p>
                    </div>
                  </div>
                </div>
              </Section>
              
              <div className="flex justify-end pt-2">
                <Button disabled={isSaving} onClick={handleSave} className={cn("h-11 px-8 rounded-xl font-bold shadow-sm text-white transition-colors", saved ? "bg-green-600 hover:bg-green-700" : "bg-gray-900 hover:bg-gray-800")}>
                  {saved ? <CheckCircle2 size={18} className="mr-2" /> : <Save size={18} className="mr-2" />}
                  {isSaving ? "Saving Config…" : saved ? "Config Saved!" : "Save Global Settings"}
                </Button>
              </div>
            </div>
          )}

          {activeTab === "rooms" && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <Section title="Add New Room" description="Register a new room to the property database." icon={BedDouble}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Room Number</Label>
                    <Input placeholder="e.g. 101" value={newRoom.number} onChange={e => setNewRoom(p => ({ ...p, number: e.target.value, floor: e.target.value.charAt(0) }))} className={inputClass} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Category</Label>
                    <select value={newRoom.category} onChange={e => setNewRoom(p => ({...p, category: e.target.value}))} className={cn("w-full px-3", inputClass)}>
                      <option>Standard</option>
                      <option>Premium</option>
                      <option>Luxury</option>
                      <option>Suite</option>
                    </select>
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-semibold">Tariff (₹/night)</Label>
                    <Input type="number" placeholder="0" value={newRoom.tariff} onChange={e => setNewRoom(p => ({ ...p, tariff: e.target.value }))} className={inputClass} />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2 mt-1">
                    <Label className="text-xs font-semibold">Gallery Photos (will appear on room detail page)</Label>
                    <GalleryUploader value={newRoom.images} onChange={(urls) => setNewRoom(p => ({ ...p, images: urls, image: urls[0] || "" }))} />
                  </div>
                </div>
                <Button onClick={handleAddRoom} disabled={!newRoom.number || !newRoom.tariff} className="w-full mt-4 bg-green-600 text-white rounded-xl h-10 gap-2 hover:bg-green-700">
                  <Plus size={16} /> Create Room
                </Button>
              </Section>

              {/* ── Existing Rooms List ── */}
              <Section title="Existing Rooms" description="Click ✏️ to edit photos, tariff, and description." icon={BedDouble}>
                {allRooms.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No rooms added yet.</p>
                ) : (
                  <div className="space-y-2">
                    {allRooms.map(room => (
                      <div key={room._id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-white transition-colors">
                        {room.image || (room.images?.[0]) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={room.image || room.images?.[0]} alt={room.roomNumber} className="w-14 h-10 rounded-lg object-cover shrink-0 border border-gray-200" />
                        ) : (
                          <div className="w-14 h-10 rounded-lg bg-gray-200 flex items-center justify-center shrink-0">
                            <BedDouble size={14} className="text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900">Room {room.roomNumber}</p>
                          <p className="text-xs text-gray-500 capitalize">{room.category} · ₹{room.tariff}/night · {room.images?.length || (room.image ? 1 : 0)} photo(s)</p>
                        </div>
                        <button
                          onClick={() => setEditRoom({
                            _id: room._id,
                            category: room.category,
                            tariff: room.tariff.toString(),
                            description: room.description || "",
                            image: room.image || "",
                            images: room.images || (room.image ? [room.image] : []),
                            amenities: (room.amenities || []).join(", "),
                          })}
                          className="p-2 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors shrink-0"
                        >
                          <Pencil size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              {/* ── Edit Room Modal ── */}
              {editRoom && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between p-5 border-b border-gray-100">
                      <h3 className="text-lg font-bold text-gray-900">Edit Room {allRooms.find(r => r._id === editRoom._id)?.roomNumber}</h3>
                      <button onClick={() => setEditRoom(null)} className="p-2 rounded-lg hover:bg-gray-100"><X size={16} /></button>
                    </div>
                    <div className="p-5 space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">Category</Label>
                          <select value={editRoom.category} onChange={e => setEditRoom(p => p && ({...p, category: e.target.value}))} className={cn("w-full px-3", inputClass)}>
                            <option>standard</option><option>premium</option><option>luxury</option><option>suite</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">Tariff (₹/night)</Label>
                          <Input type="number" value={editRoom.tariff} onChange={e => setEditRoom(p => p && ({...p, tariff: e.target.value}))} className={inputClass} />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Description</Label>
                        <textarea value={editRoom.description} onChange={e => setEditRoom(p => p && ({...p, description: e.target.value}))} rows={2} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500/20 resize-none" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Amenities (comma-separated)</Label>
                        <Input value={editRoom.amenities} onChange={e => setEditRoom(p => p && ({...p, amenities: e.target.value}))} placeholder="AC, WiFi, TV, King Bed" className={inputClass} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Gallery Photos (first = hero image)</Label>
                        <GalleryUploader
                          value={editRoom.images}
                          onChange={urls => setEditRoom(p => p && ({...p, images: urls, image: urls[0] || ""}))}
                        />
                      </div>
                    </div>
                    <div className="flex gap-3 p-5 border-t border-gray-100">
                      <Button variant="outline" onClick={() => setEditRoom(null)} className="flex-1 rounded-xl">Cancel</Button>
                      <Button onClick={handleSaveRoomEdit} disabled={isSavingEdit} className="flex-1 rounded-xl bg-green-600 hover:bg-green-700 text-white">
                        {isSavingEdit ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "banquets" && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <Section title="Add Banquet Hall" description="Register a new event hall or venue space." icon={LayoutDashboard}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-semibold">Hall Name</Label>
                    <Input placeholder="e.g. Grand Crystal Hall" value={newHall.name} onChange={e => setNewHall(p => ({ ...p, name: e.target.value }))} className={inputClass} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Hall Type</Label>
                    <select value={newHall.type} onChange={e => setNewHall(p => ({...p, type: e.target.value}))} className={cn("w-full px-3", inputClass)}>
                      <option>Indoor</option>
                      <option>Outdoor</option>
                      <option>First Floor</option>
                      <option>Rooftop</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Capacity (PAX)</Label>
                    <Input type="number" placeholder="500" value={newHall.capacity} onChange={e => setNewHall(p => ({ ...p, capacity: e.target.value }))} className={inputClass} />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-semibold">Starting Price (₹)</Label>
                    <Input type="number" placeholder="0" value={newHall.price} onChange={e => setNewHall(p => ({ ...p, price: e.target.value }))} className={inputClass} />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2 mt-1">
                    <Label className="text-xs font-semibold">Hall Photo (Optional)</Label>
                    <ImageUploader value={newHall.image} onChange={(url) => setNewHall(p => ({ ...p, image: url }))} />
                  </div>
                </div>
                <Button onClick={handleAddHall} disabled={!newHall.name || !newHall.price} className="w-full mt-4 bg-green-600 text-white rounded-xl h-10 gap-2 hover:bg-green-700">
                  <Plus size={16} /> Create Hall
                </Button>
              </Section>

              {/* ── Existing Halls List ── */}
              <Section title="Existing Halls" description="Click ✏️ to update images or details." icon={LayoutDashboard}>
                {allHalls.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No halls added yet.</p>
                ) : (
                  <div className="space-y-2">
                    {allHalls.map(hall => (
                      <div key={hall._id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-white transition-colors">
                        {hall.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={hall.image} alt={hall.name} className="w-14 h-10 rounded-lg object-cover shrink-0 border border-gray-200" />
                        ) : (
                          <div className="w-14 h-10 rounded-lg bg-gray-200 flex items-center justify-center shrink-0">
                            <LayoutDashboard size={14} className="text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900">{hall.name}</p>
                          <p className="text-xs text-gray-500">{hall.type} · {hall.capacity} pax · ₹{hall.price || 0}</p>
                        </div>
                        <button
                          onClick={() => setEditHall({
                            _id: hall._id,
                            name: hall.name,
                            type: hall.type,
                            capacity: hall.capacity.toString(),
                            price: (hall.price || 0).toString(),
                            description: hall.description || "",
                            image: hall.image || "",
                          })}
                          className="p-2 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors shrink-0"
                        >
                          <Pencil size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              {/* ── Edit Hall Modal ── */}
              {editHall && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between p-5 border-b border-gray-100">
                      <h3 className="text-lg font-bold text-gray-900">Edit {editHall.name}</h3>
                      <button onClick={() => setEditHall(null)} className="p-2 rounded-lg hover:bg-gray-100"><X size={16} /></button>
                    </div>
                    <div className="p-5 space-y-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Hall Name</Label>
                        <Input value={editHall.name} onChange={e => setEditHall(p => p && ({...p, name: e.target.value}))} className={inputClass} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">Type</Label>
                          <select value={editHall.type} onChange={e => setEditHall(p => p && ({...p, type: e.target.value}))} className={cn("w-full px-3", inputClass)}>
                            <option>Indoor</option><option>Outdoor</option><option>First Floor</option><option>Rooftop</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">Capacity (PAX)</Label>
                          <Input type="number" value={editHall.capacity} onChange={e => setEditHall(p => p && ({...p, capacity: e.target.value}))} className={inputClass} />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Starting Price (₹)</Label>
                        <Input type="number" value={editHall.price} onChange={e => setEditHall(p => p && ({...p, price: e.target.value}))} className={inputClass} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Description</Label>
                        <textarea value={editHall.description} onChange={e => setEditHall(p => p && ({...p, description: e.target.value}))} rows={2} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500/20 resize-none" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Hall Photo</Label>
                        <ImageUploader value={editHall.image} onChange={url => setEditHall(p => p && ({...p, image: url}))} />
                      </div>
                    </div>
                    <div className="flex gap-3 p-5 border-t border-gray-100">
                      <Button variant="outline" onClick={() => setEditHall(null)} className="flex-1 rounded-xl">Cancel</Button>
                      <Button onClick={handleSaveHallEdit} disabled={isSavingEdit} className="flex-1 rounded-xl bg-green-600 hover:bg-green-700 text-white">
                        {isSavingEdit ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "menu" && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <Section title="Add Menu Item" description="Add items to Restaurant or Café POS menus." icon={UtensilsCrossed}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-semibold">Item Name</Label>
                    <Input placeholder="e.g. Masala Dosa" value={newMenuItem.name} onChange={e => setNewMenuItem(p => ({ ...p, name: e.target.value }))} className={inputClass} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Price (₹)</Label>
                    <Input type="number" placeholder="0" value={newMenuItem.price} onChange={e => setNewMenuItem(p => ({ ...p, price: e.target.value }))} className={inputClass} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Outlet</Label>
                    <select value={newMenuItem.outlet} onChange={e => setNewMenuItem(p => ({...p, outlet: e.target.value}))} className={cn("w-full px-3", inputClass)}>
                      <option value="restaurant">Restaurant</option>
                      <option value="cafe">Café</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Category Type</Label>
                    <select value={newMenuItem.category} onChange={e => setNewMenuItem(p => ({...p, category: e.target.value}))} className={cn("w-full px-3", inputClass)}>
                      <option>Food</option>
                      <option>Beverage</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Sub Category</Label>
                    <select value={newMenuItem.subCategory} onChange={e => setNewMenuItem(p => ({...p, subCategory: e.target.value}))} className={cn("w-full px-3", inputClass)}>
                      {newMenuItem.category === 'Food' ? (
                        <>
                          <option>Starters</option>
                          <option>Main Course</option>
                          <option>Breads</option>
                          <option>Desserts</option>
                          <option>Snacks</option>
                          <option>Bakery</option>
                        </>
                      ) : (
                        <>
                          <option>Coffees</option>
                          <option>Teas</option>
                          <option>Beverages</option>
                        </>
                      )}
                    </select>
                  </div>
                  <div className="space-y-1.5 sm:col-span-2 mt-1">
                    <Label className="text-xs font-semibold">Item Photo (Optional)</Label>
                    <ImageUploader value={newMenuItem.image} onChange={(url) => setNewMenuItem(p => ({ ...p, image: url }))} />
                  </div>
                </div>
                <Button onClick={handleAddMenu} disabled={!newMenuItem.name || !newMenuItem.price} className="w-full mt-4 bg-green-600 text-white rounded-xl h-10 gap-2 hover:bg-green-700">
                  <Plus size={16} /> Create Menu Item
                </Button>
              </Section>

              {/* ── Existing Menu Items List ── */}
              <Section title="Existing Menu Items" description="Click ✏️ to update price or photo." icon={UtensilsCrossed}>
                {allMenuItems.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No menu items yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {["restaurant", "cafe"].map(outlet => {
                      const items = allMenuItems.filter((i: any) => i.outlet === outlet);
                      if (!items.length) return null;
                      return (
                        <div key={outlet}>
                          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 mt-3">{outlet === "restaurant" ? "Restaurant" : "Café"}</p>
                          {items.map((item: any) => (
                            <div key={item._id} className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-100 bg-gray-50 hover:bg-white transition-colors mb-1.5">
                              {item.image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={item.image} alt={item.name} className="w-10 h-10 rounded-lg object-cover shrink-0 border border-gray-200" />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center shrink-0">
                                  <UtensilsCrossed size={12} className="text-gray-400" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                                <p className="text-xs text-gray-500">{item.subCategory} · ₹{item.price}</p>
                              </div>
                              <button
                                onClick={() => setEditMenuItem({
                                  _id: item._id,
                                  name: item.name,
                                  category: item.category,
                                  subCategory: item.subCategory,
                                  price: item.price.toString(),
                                  outlet: item.outlet,
                                  image: item.image || "",
                                })}
                                className="p-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors shrink-0"
                              >
                                <Pencil size={13} />
                              </button>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Section>

              {/* ── Edit Menu Item Modal ── */}
              {editMenuItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between p-5 border-b border-gray-100">
                      <h3 className="text-lg font-bold text-gray-900">Edit {editMenuItem.name}</h3>
                      <button onClick={() => setEditMenuItem(null)} className="p-2 rounded-lg hover:bg-gray-100"><X size={16} /></button>
                    </div>
                    <div className="p-5 space-y-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Item Name</Label>
                        <Input value={editMenuItem.name} onChange={e => setEditMenuItem(p => p && ({...p, name: e.target.value}))} className={inputClass} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">Price (₹)</Label>
                          <Input type="number" value={editMenuItem.price} onChange={e => setEditMenuItem(p => p && ({...p, price: e.target.value}))} className={inputClass} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">Category</Label>
                          <select value={editMenuItem.category} onChange={e => setEditMenuItem(p => p && ({...p, category: e.target.value}))} className={cn("w-full px-3", inputClass)}>
                            <option>Food</option><option>Beverage</option>
                          </select>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Sub Category</Label>
                        <select value={editMenuItem.subCategory} onChange={e => setEditMenuItem(p => p && ({...p, subCategory: e.target.value}))} className={cn("w-full px-3", inputClass)}>
                          {editMenuItem.category === "Food" ? (
                            <><option>Starters</option><option>Main Course</option><option>Breads</option><option>Desserts</option><option>Snacks</option><option>Bakery</option></>
                          ) : (
                            <><option>Coffees</option><option>Teas</option><option>Beverages</option></>
                          )}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Item Photo</Label>
                        <ImageUploader value={editMenuItem.image} onChange={url => setEditMenuItem(p => p && ({...p, image: url}))} />
                      </div>
                    </div>
                    <div className="flex gap-3 p-5 border-t border-gray-100">
                      <Button variant="outline" onClick={() => setEditMenuItem(null)} className="flex-1 rounded-xl">Cancel</Button>
                      <Button onClick={handleSaveMenuEdit} disabled={isSavingEdit} className="flex-1 rounded-xl bg-green-600 hover:bg-green-700 text-white">
                        {isSavingEdit ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "staff" && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* Custom Staff Roles */}
              <Section title="Staff Role Types" description="Add custom roles beyond the defaults (admin, manager, reception, kitchen)." icon={ShieldCheck}>
                <div className="space-y-3">
                  {/* Add new role */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. housekeeping, accountant, security"
                      value={newRoleInput}
                      onChange={e => setNewRoleInput(e.target.value.toLowerCase().replace(/\s+/g, "_"))}
                      onKeyDown={e => {
                        if (e.key === "Enter" && newRoleInput.trim()) {
                          const role = newRoleInput.trim();
                          if (!staffTypes.includes(role) && !BASE_ROLES.includes(role)) {
                            setStaffTypes(p => [...p, role]);
                          }
                          setNewRoleInput("");
                        }
                      }}
                      className={inputClass}
                    />
                    <Button
                      onClick={() => {
                        const role = newRoleInput.trim();
                        if (role && !staffTypes.includes(role) && !BASE_ROLES.includes(role)) {
                          setStaffTypes(p => [...p, role]);
                          setNewRoleInput("");
                        }
                      }}
                      disabled={!newRoleInput.trim()}
                      className="h-10 px-4 bg-green-600 hover:bg-green-700 text-white rounded-xl shrink-0"
                    >
                      <Plus size={16} />
                    </Button>
                  </div>
                  {/* Base roles (read-only) */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    {BASE_ROLES.map(role => (
                      <span key={role} className={cn("text-xs font-bold px-3 py-1 rounded-full border", getRoleColor(role))}>
                        {role} <span className="opacity-50 font-normal">(built-in)</span>
                      </span>
                    ))}
                    {/* Custom roles */}
                    {staffTypes.map(role => (
                      <span key={role} className="flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border bg-gray-100 text-gray-700 border-gray-200">
                        {role}
                        <button
                          onClick={() => setStaffTypes(p => p.filter(r => r !== role))}
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

              <Section title="Create Staff Access" description="Add new staff and their roles to access specific POS registers." icon={UserPlus}>
                {(() => {
                  const allRoles = [...BASE_ROLES, ...staffTypes];
                  return (
                    <div className="grid grid-cols-3 gap-4 items-end mb-6">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Staff Name</Label>
                        <Input placeholder="e.g. Rahul Waiter" value={newStaff.name} onChange={e => setNewStaff(p => ({ ...p, name: e.target.value }))} className={inputClass} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Role</Label>
                        <select value={newStaff.role} onChange={e => setNewStaff(p => ({...p, role: e.target.value}))} className={cn("w-full px-3", inputClass)}>
                          {allRoles.map(r => (
                            <option key={r} value={r} className="capitalize">{r.replace(/_/g, " ")}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">4-Digit PIN</Label>
                        <Input type="password" placeholder="e.g. 1234" maxLength={4} value={newStaff.pin} onChange={e => setNewStaff(p => ({ ...p, pin: e.target.value }))} className={inputClass} />
                      </div>
                    </div>
                  );
                })()}
                <Button onClick={handleAddStaff} disabled={!newStaff.name || newStaff.pin.length !== 4} className="w-full bg-indigo-600 text-white rounded-xl h-10 gap-2 hover:bg-indigo-700">
                  <UserPlus size={16} /> Add Staff Member
                </Button>
              </Section>

              <Section title="Active Personnel" icon={Lock}>
                <div className="space-y-3">
                  {allStaff.map((s: any) => (
                    <div key={s._id} className="flex justify-between items-center p-3 rounded-xl border border-gray-100 bg-gray-50/50">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold", ROLE_COLORS[s.role] || "bg-gray-100 text-gray-600")}>
                          {s.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 leading-tight">{s.name}</p>
                          <p className="text-xs text-gray-500 capitalize">{s.role}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 items-center">
                        <span className={cn("text-[10px] uppercase font-bold px-2 py-1 rounded-md", s.isActive ? "bg-green-100 text-green-700" : "bg-rose-100 text-rose-700")}>
                          {s.isActive ? "Active" : "Inactive"}
                        </span>
                        {isAdmin && token && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={async () => {
                              try {
                                await updateStaff({ token, staffId: s._id, isActive: !s.isActive });
                                toast.success(`${s.name} ${s.isActive ? "deactivated" : "reactivated"}`);
                              } catch (e: any) { toast.error(e.message); }
                            }}
                            className={cn("text-xs h-7 px-3 rounded-lg font-semibold", s.isActive ? "text-rose-600 hover:bg-rose-50" : "text-green-600 hover:bg-green-50")}
                          >
                            {s.isActive ? "Deactivate" : "Reactivate"}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  {allStaff.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">No staff members configured yet.</p>
                  )}
                </div>
              </Section>
            </div>
          )}

          {activeTab === "permissions" && isAdmin && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <Section
                title="Role-Based Access Control"
                description="Configure which pages each staff role can access. Changes take effect immediately on next login."
                icon={ShieldCheck}
              >
                <div className="space-y-6">
                  {[...BASE_ROLES, ...staffTypes].map(role => (
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
                            onClick={() => handleSavePermissions(role)}
                            disabled={savingRole === role}
                            className="h-8 px-4 rounded-xl text-xs font-bold bg-green-600 hover:bg-green-700 text-white"
                          >
                            {savingRole === role ? "Saving…" : "Save"}
                          </Button>
                        )}
                      </div>
                      <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {ALL_PAGES.map(page => {
                          const isChecked = role === "admin" || (permissionDraft[role] || []).includes(page.href);
                          return (
                            <label
                              key={page.href}
                              className={cn(
                                "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all select-none",
                                role === "admin" ? "opacity-60 cursor-not-allowed bg-gray-50 border-gray-100" :
                                  isChecked ? "bg-green-50 border-green-200" : "bg-white border-gray-100 hover:bg-gray-50"
                              )}
                              onClick={() => togglePath(role, page.href)}
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
          )}
        </div>
      </div>
    </div>
  );
}
