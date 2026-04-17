// components/settings/tabs/GeneralTab.tsx

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Save, Building2, Percent, SlidersHorizontal, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Section } from "./sections";

export interface GeneralFormData {
    hotelName: string;
    gstin: string;
    address: string;
    email: string;
    phone: string;
    roomGst: string;
    foodGst: string;
    alGst: string;
    autoCheckoutReminders: boolean;
    requireIdUpload: boolean;
    defaultKitchenTab: string;
    defaultBillingTab: string;
    advancePercentage: string;
}

interface GeneralTabProps {
    formData: GeneralFormData;
    isSaving: boolean;
    saved: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    onToggle: (key: keyof GeneralFormData, value: boolean) => void;
    onSelectChange: (key: keyof GeneralFormData, value: string) => void;
    onSave: () => void;
}

const inputClass = "rounded-xl border-gray-200 bg-gray-50 focus:bg-white transition-colors text-sm h-10";

export function GeneralTab({
    formData, isSaving, saved, onChange, onToggle, onSelectChange, onSave,
}: GeneralTabProps) {
    return (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Section title="Hotel Profile" description="This information appears on all guest invoices." icon={Building2}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="hotelName" className="text-xs font-semibold text-gray-600">Business Name</Label>
                        <Input id="hotelName" value={formData.hotelName} onChange={onChange} className={inputClass} />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="gstin" className="text-xs font-semibold text-gray-600">GSTIN Number</Label>
                        <Input id="gstin" value={formData.gstin} onChange={onChange} className={inputClass} />
                    </div>
                </div>
                <div className="mt-4 space-y-1.5">
                    <Label htmlFor="address" className="text-xs font-semibold text-gray-600">Registered Address</Label>
                    <textarea
                        id="address"
                        value={formData.address}
                        onChange={onChange}
                        rows={3}
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 focus:bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500/20 resize-none transition-colors"
                    />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="email" className="text-xs font-semibold text-gray-600">Contact Email</Label>
                        <Input id="email" type="email" value={formData.email} onChange={onChange} className={inputClass} />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="phone" className="text-xs font-semibold text-gray-600">Contact Phone</Label>
                        <Input id="phone" type="tel" value={formData.phone} onChange={onChange} className={inputClass} />
                    </div>
                </div>
            </Section>

            <Section title="Default Tax Rates" description="Configure standard GST percentages." icon={Percent}>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                        { id: "roomGst", label: "Room GST (%)" },
                        { id: "foodGst", label: "Food GST (%)" },
                        { id: "alGst", label: "Admin / Ext GST (%)" },
                    ].map((f) => (
                        <div key={f.id} className="space-y-1.5">
                            <Label htmlFor={f.id} className="text-xs font-semibold text-gray-600">{f.label}</Label>
                            <Input
                                id={f.id}
                                type="number"
                                value={(formData as any)[f.id]}
                                onChange={onChange}
                                className={cn(inputClass, "tabular-nums")}
                            />
                        </div>
                    ))}
                </div>
            </Section>

            <Section title="System Preferences" icon={SlidersHorizontal}>
                <div className="space-y-4">
                    {[
                        { key: "autoCheckoutReminders" as const, label: "Auto Checkout Reminders", desc: "Highlight rooms due for checkout today in amber." },
                        { key: "requireIdUpload" as const, label: "Require Guest ID Upload", desc: "Make ID photo attachment mandatory during check-in." },
                    ].map((pref, i) => (
                        <div key={pref.key} className={cn("flex items-center justify-between", i > 0 && "pt-4 border-t border-gray-100")}>
                            <div>
                                <p className="text-sm font-semibold text-gray-900">{pref.label}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{pref.desc}</p>
                            </div>
                            <Switch
                                checked={formData[pref.key] as boolean}
                                onCheckedChange={(c: boolean) => onToggle(pref.key, c)}
                            />
                        </div>
                    ))}

                    <div className="pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-gray-700">Default Kitchen KDS Tab</Label>
                            <select
                                value={formData.defaultKitchenTab}
                                onChange={(e) => onSelectChange("defaultKitchenTab", e.target.value)}
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
                                onChange={(e) => onSelectChange("defaultBillingTab", e.target.value)}
                                className={cn("w-full px-3", inputClass)}
                            >
                                <option value="rooms">Room Folios</option>
                                <option value="tables">Table Bills</option>
                            </select>
                            <p className="text-[11px] text-gray-400">Which section opens by default in Billing.</p>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="advancePercentage" className="text-xs font-semibold text-gray-700">Online Advance Percentage (%)</Label>
                            <div className="relative">
                               <Input 
                                 id="advancePercentage" 
                                 type="number" 
                                 value={formData.advancePercentage} 
                                 onChange={onChange} 
                                 className={cn(inputClass, "pr-8")} 
                                 min="0"
                                 max="100"
                               />
                               <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 font-mono">%</span>
                            </div>
                            <p className="text-[11px] text-gray-400">Portion of total guests pay online to confirm.</p>
                        </div>
                    </div>
                </div>
            </Section>

            <div className="flex justify-end pt-2">
                <Button
                    disabled={isSaving}
                    onClick={onSave}
                    className={cn(
                        "h-11 px-8 rounded-xl font-bold shadow-sm text-white transition-colors",
                        saved ? "bg-green-600 hover:bg-green-700" : "bg-gray-900 hover:bg-gray-800"
                    )}
                >
                    {saved ? <CheckCircle2 size={18} className="mr-2" /> : <Save size={18} className="mr-2" />}
                    {isSaving ? "Saving Config…" : saved ? "Config Saved!" : "Save Global Settings"}
                </Button>
            </div>
        </div>
    );
}