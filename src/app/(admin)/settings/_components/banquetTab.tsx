// components/settings/tabs/BanquetsTab.tsx

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Plus, Pencil, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { toast } from "sonner";
import { ImageUploader } from "@/components/ImageUploader";
import { Section } from "./sections";

const inputClass = "rounded-xl border-gray-200 bg-gray-50 focus:bg-white transition-colors text-sm h-10";

type EditHall = {
    _id: any;
    name: string;
    type: string;
    capacity: string;
    price: string;
    description: string;
    image: string;
};

export function BanquetsTab() {
    const allHalls = useQuery(api.banquet.getAllHalls, { includeInactive: true }) || [];
    const addHall = useMutation(api.banquet.addHall);
    const updateHall = useMutation(api.banquet.updateHall);
    const toggleActive = useMutation(api.banquet.toggleHallActive);

    const [newHall, setNewHall] = useState({ name: "", type: "Indoor", capacity: "", price: "", image: "" });
    const [editHall, setEditHall] = useState<EditHall | null>(null);
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    const handleAddHall = async () => {
        try {
            await addHall({
                name: newHall.name,
                type: newHall.type,
                capacity: parseInt(newHall.capacity || "100"),
                price: parseInt(newHall.price || "0"),
                ...(newHall.image && { image: newHall.image }),
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

    return (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Section title="Add Banquet Hall" description="Register a new event hall or venue space." icon={LayoutDashboard}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5 sm:col-span-2">
                        <Label className="text-xs font-semibold">Hall Name</Label>
                        <Input
                            placeholder="e.g. Grand Crystal Hall"
                            value={newHall.name}
                            onChange={(e) => setNewHall((p) => ({ ...p, name: e.target.value }))}
                            className={inputClass}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Hall Type</Label>
                        <select
                            value={newHall.type}
                            onChange={(e) => setNewHall((p) => ({ ...p, type: e.target.value }))}
                            className={cn("w-full px-3", inputClass)}
                        >
                            <option>Indoor</option>
                            <option>Outdoor</option>
                            <option>First Floor</option>
                            <option>Rooftop</option>
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Capacity (PAX)</Label>
                        <Input
                            type="number"
                            placeholder="500"
                            value={newHall.capacity}
                            onChange={(e) => setNewHall((p) => ({ ...p, capacity: e.target.value }))}
                            className={inputClass}
                        />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                        <Label className="text-xs font-semibold">Starting Price (₹)</Label>
                        <Input
                            type="number"
                            placeholder="0"
                            value={newHall.price}
                            onChange={(e) => setNewHall((p) => ({ ...p, price: e.target.value }))}
                            className={inputClass}
                        />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2 mt-1">
                        <Label className="text-xs font-semibold">Hall Photo (Optional)</Label>
                        <ImageUploader value={newHall.image} onChange={(url) => setNewHall((p) => ({ ...p, image: url }))} />
                    </div>
                </div>
                <Button
                    onClick={handleAddHall}
                    disabled={!newHall.name || !newHall.price}
                    className="w-full mt-4 bg-green-600 text-white rounded-xl h-10 gap-2 hover:bg-green-700"
                >
                    <Plus size={16} /> Create Hall
                </Button>
            </Section>

            <Section title="Existing Halls" description="Click ✏️ to update images or details." icon={LayoutDashboard}>
                {allHalls.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">No halls added yet.</p>
                ) : (
                    <div className="space-y-2">
                        {allHalls.map((hall) => (
                            <div
                                key={hall._id}
                                className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-white transition-colors"
                            >
                                {hall.image ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={hall.image}
                                        alt={hall.name}
                                        className="w-14 h-10 rounded-lg object-cover shrink-0 border border-gray-200"
                                    />
                                ) : (
                                    <div className="w-14 h-10 rounded-lg bg-gray-200 flex items-center justify-center shrink-0">
                                        <LayoutDashboard size={14} className="text-gray-400" />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-bold text-gray-900">{hall.name}</p>
                                        {!hall.isActive && (
                                            <span className="text-[9px] font-black bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                                                Inactive
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        {hall.type} · {hall.capacity} pax · ₹{hall.price || 0}
                                    </p>
                                </div>
                                <div className="flex gap-1.5 shrink-0">
                                    <button
                                        onClick={async () => {
                                            try {
                                                await toggleActive({ hallId: hall._id });
                                                toast.success(`Hall ${hall.name} ${hall.isActive ? "deactivated" : "reactivated"}`);
                                            } catch (e: any) {
                                                toast.error(e.message);
                                            }
                                        }}
                                        className={cn(
                                            "p-2 rounded-lg transition-colors",
                                            hall.isActive 
                                                ? "bg-rose-50 text-rose-600 hover:bg-rose-100" 
                                                : "bg-green-50 text-green-700 hover:bg-green-100"
                                        )}
                                        title={hall.isActive ? "Deactivate Hall" : "Reactivate Hall"}
                                    >
                                        <X size={14} className={cn(!hall.isActive && "rotate-45")} />
                                    </button>
                                    <button
                                        onClick={() =>
                                            setEditHall({
                                                _id: hall._id,
                                                name: hall.name,
                                                type: hall.type,
                                                capacity: hall.capacity.toString(),
                                                price: (hall.price || 0).toString(),
                                                description: hall.description || "",
                                                image: hall.image || "",
                                            })
                                        }
                                        className="p-2 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                                    >
                                        <Pencil size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Section>

            {editHall && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900">Edit {editHall.name}</h3>
                            <button onClick={() => setEditHall(null)} className="p-2 rounded-lg hover:bg-gray-100">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Hall Name</Label>
                                <Input
                                    value={editHall.name}
                                    onChange={(e) => setEditHall((p) => p && { ...p, name: e.target.value })}
                                    className={inputClass}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">Type</Label>
                                    <select
                                        value={editHall.type}
                                        onChange={(e) => setEditHall((p) => p && { ...p, type: e.target.value })}
                                        className={cn("w-full px-3", inputClass)}
                                    >
                                        <option>Indoor</option>
                                        <option>Outdoor</option>
                                        <option>First Floor</option>
                                        <option>Rooftop</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">Capacity (PAX)</Label>
                                    <Input
                                        type="number"
                                        value={editHall.capacity}
                                        onChange={(e) => setEditHall((p) => p && { ...p, capacity: e.target.value })}
                                        className={inputClass}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Starting Price (₹)</Label>
                                <Input
                                    type="number"
                                    value={editHall.price}
                                    onChange={(e) => setEditHall((p) => p && { ...p, price: e.target.value })}
                                    className={inputClass}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Description</Label>
                                <textarea
                                    value={editHall.description}
                                    onChange={(e) => setEditHall((p) => p && { ...p, description: e.target.value })}
                                    rows={2}
                                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500/20 resize-none"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Hall Photo</Label>
                                <ImageUploader
                                    value={editHall.image}
                                    onChange={(url) => setEditHall((p) => p && { ...p, image: url })}
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 p-5 border-t border-gray-100">
                            <Button variant="outline" onClick={() => setEditHall(null)} className="flex-1 rounded-xl">
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSaveHallEdit}
                                disabled={isSavingEdit}
                                className="flex-1 rounded-xl bg-green-600 hover:bg-green-700 text-white"
                            >
                                {isSavingEdit ? "Saving..." : "Save Changes"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}