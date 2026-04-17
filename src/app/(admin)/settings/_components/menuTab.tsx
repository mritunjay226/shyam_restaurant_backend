// components/settings/tabs/MenuTab.tsx

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { UtensilsCrossed, Plus, Pencil, X, Search, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { toast } from "sonner";
import { ImageUploader } from "@/components/ImageUploader";
import { Section } from "./sections";

const inputClass = "rounded-xl border-gray-200 bg-gray-50 focus:bg-white transition-colors text-sm h-10";

type EditMenuItem = {
    _id: any;
    name: string;
    categoryId: string;
    description: string;
    price: string;
    unit: string;
    dietaryType: "veg" | "non-veg" | "egg";
    image: string;
};

export function MenuTab() {
    const allCategories = useQuery(api.banquetMenu.getCategories) || [];
    const allMenuItems = useQuery(api.banquetMenu.getMenuItems, {}) || [];
    
    const addMenu = useMutation(api.banquetMenu.createMenuItem);
    const updateMenuItem = useMutation(api.banquetMenu.updateMenuItem);
    const toggleAvailability = useMutation(api.banquetMenu.toggleAvailability);

    const [newMenuItem, setNewMenuItem] = useState({
        name: "", 
        categoryId: "", 
        price: "", 
        unit: "pax", 
        description: "",
        dietaryType: "veg" as "veg" | "non-veg" | "egg",
        image: "",
    });
    const [editMenuItem, setEditMenuItem] = useState<EditMenuItem | null>(null);
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    // Filter states
    const [searchTerm, setSearchTerm] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [dietaryFilter, setDietaryFilter] = useState("all");

    const filteredMenuItems = allMenuItems.filter((item: any) => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = categoryFilter === "all" || item.categoryId === categoryFilter;
        const matchesDietary = dietaryFilter === "all" || item.dietaryType === dietaryFilter;
        return matchesSearch && matchesCategory && matchesDietary;
    });

    const handleAddMenu = async () => {
        if (!newMenuItem.categoryId) {
            toast.error("Please select a category");
            return;
        }
        try {
            await addMenu({
                categoryId: newMenuItem.categoryId as any,
                name: newMenuItem.name,
                description: newMenuItem.description,
                price: parseInt(newMenuItem.price || "0"),
                unit: newMenuItem.unit,
                dietaryType: newMenuItem.dietaryType,
                isAvailable: true,
                ...(newMenuItem.image && { image: newMenuItem.image }),
            });
            toast.success("Banquet menu item added!");
            setNewMenuItem({ name: "", categoryId: "", price: "", unit: "pax", description: "", dietaryType: "veg", image: "" });
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    const handleSaveMenuEdit = async () => {
        if (!editMenuItem) return;
        setIsSavingEdit(true);
        try {
            await updateMenuItem({
                id: editMenuItem._id,
                name: editMenuItem.name,
                categoryId: editMenuItem.categoryId as any,
                description: editMenuItem.description,
                price: parseInt(editMenuItem.price || "0"),
                unit: editMenuItem.unit,
                dietaryType: editMenuItem.dietaryType,
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
// hola amigo kaise ho thik ho
    return (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Section title="Add Banquet Menu Item" description="Add specialized items to the banquet food and beverage menu." icon={UtensilsCrossed}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5 sm:col-span-2">
                        <Label className="text-xs font-semibold">Item Name</Label>
                        <Input
                            placeholder="e.g. Royal Thali"
                            value={newMenuItem.name}
                            onChange={(e) => setNewMenuItem((p) => ({ ...p, name: e.target.value }))}
                            className={inputClass}
                        />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                        <Label className="text-xs font-semibold">Description</Label>
                        <Input
                            placeholder="Brief details about the item..."
                            value={newMenuItem.description}
                            onChange={(e) => setNewMenuItem((p) => ({ ...p, description: e.target.value }))}
                            className={inputClass}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Price (₹)</Label>
                        <Input
                            type="number"
                            placeholder="0"
                            value={newMenuItem.price}
                            onChange={(e) => setNewMenuItem((p) => ({ ...p, price: e.target.value }))}
                            className={inputClass}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Unit (Pricing Per)</Label>
                        <select
                            value={newMenuItem.unit}
                            onChange={(e) => setNewMenuItem((p) => ({ ...p, unit: e.target.value }))}
                            className={cn("w-full px-3", inputClass)}
                        >
                            <option value="pax">Per Pax</option>
                            <option value="plate">Per Plate</option>
                            <option value="kg">Per Kg</option>
                            <option value="pc">Per Piece</option>
                            <option value="bottle">Per Bottle</option>
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Category</Label>
                        <select
                            value={newMenuItem.categoryId}
                            onChange={(e) => setNewMenuItem((p) => ({ ...p, categoryId: e.target.value }))}
                            className={cn("w-full px-3", inputClass)}
                        >
                            <option value="">Select Category</option>
                            {allCategories.map((cat: any) => (
                                <option key={cat._id} value={cat._id}>{cat.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Dietary Type</Label>
                        <select
                            value={newMenuItem.dietaryType}
                            onChange={(e) => setNewMenuItem((p) => ({ ...p, dietaryType: e.target.value as any }))}
                            className={cn("w-full px-3", inputClass)}
                        >
                            <option value="veg">Veg</option>
                            <option value="non-veg">Non-Veg</option>
                            <option value="egg">Egg</option>
                        </select>
                    </div>
                    <div className="space-y-1.5 sm:col-span-2 mt-1">
                        <Label className="text-xs font-semibold">Item Photo (Optional)</Label>
                        <ImageUploader
                            value={newMenuItem.image}
                            onChange={(url) => setNewMenuItem((p) => ({ ...p, image: url }))}
                        />
                    </div>
                </div>
                <Button
                    onClick={handleAddMenu}
                    disabled={!newMenuItem.name || !newMenuItem.price}
                    className="w-full mt-4 bg-green-600 text-white rounded-xl h-10 gap-2 hover:bg-green-700"
                >
                    <Plus size={16} /> Create Menu Item
                </Button>
            </Section>

            <Section title="Existing Menu Items" description="Search and filter active banquet menu items." icon={UtensilsCrossed}>
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <Input
                            placeholder="Search by item name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={cn("pl-10", inputClass)}
                        />
                    </div>
                    <div className="flex gap-2">
                        <div className="relative w-32 sm:w-40">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                            <select
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                                className={cn("pl-9 w-full appearance-none", inputClass)}
                            >
                                <option value="all">All Categories</option>
                                {allCategories.map((cat: any) => (
                                    <option key={cat._id} value={cat._id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="relative w-28 sm:w-32">
                            <select
                                value={dietaryFilter}
                                onChange={(e) => setDietaryFilter(e.target.value)}
                                className={cn("px-3 w-full appearance-none", inputClass)}
                            >
                                <option value="all">Any Diet</option>
                                <option value="veg">Veg</option>
                                <option value="non-veg">Non-Veg</option>
                                <option value="egg">Egg</option>
                            </select>
                        </div>
                    </div>
                </div>

                {filteredMenuItems.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                        {searchTerm || categoryFilter !== "all" || dietaryFilter !== "all" 
                            ? "No items match your filters." 
                            : "No menu items yet."}
                    </p>
                ) : (
                    <div className="space-y-1.5">
                        {allCategories.map((cat: any) => {
                            const items = filteredMenuItems.filter((i: any) => i.categoryId === cat._id);
                            if (!items.length) return null;
                            return (
                                <div key={cat._id}>
                                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 mt-3 pl-1">
                                        {cat.name}
                                    </p>
                                    {items.map((item: any) => (
                                        <div
                                            key={item._id}
                                            className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-100 bg-gray-50 hover:bg-white transition-colors mb-1.5"
                                        >
                                            {item.image ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={item.image}
                                                    alt={item.name}
                                                    className="w-10 h-10 rounded-lg object-cover shrink-0 border border-gray-200"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center shrink-0">
                                                    <UtensilsCrossed size={12} className="text-gray-400" />
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                                                    {!item.isAvailable && (
                                                        <span className="text-[9px] font-black bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                                                            Out of Stock
                                                        </span>
                                                    )}
                                                    <span className={cn(
                                                        "text-[8px] px-1 py-0.5 rounded font-bold uppercase",
                                                        item.dietaryType === 'veg' ? "bg-green-100 text-green-700" :
                                                        item.dietaryType === 'non-veg' ? "bg-red-100 text-red-700" :
                                                        "bg-amber-100 text-amber-700"
                                                    )}>
                                                        {item.dietaryType}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-500 line-clamp-1">
                                                    {item.description || "No description"} · ₹{item.price}/{item.unit}
                                                </p>
                                            </div>
                                            <div className="flex gap-1.5 shrink-0">
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            await toggleAvailability({ id: item._id, isAvailable: !item.isAvailable });
                                                            toast.success(`${item.name} is now ${!item.isAvailable ? "available" : "unavailable"}`);
                                                        } catch (e: any) {
                                                            toast.error(e.message);
                                                        }
                                                    }}
                                                    className={cn(
                                                        "p-1.5 rounded-lg transition-colors",
                                                        item.isAvailable 
                                                            ? "bg-amber-50 text-amber-600 hover:bg-amber-100" 
                                                            : "bg-green-50 text-green-700 hover:bg-green-100"
                                                    )}
                                                    title={item.isAvailable ? "Mark as Out of Stock" : "Mark as Available"}
                                                >
                                                    <div className={cn("w-3 h-3 rounded-full", item.isAvailable ? "bg-amber-500" : "bg-green-500")} />
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        setEditMenuItem({
                                                            _id: item._id,
                                                            name: item.name,
                                                            categoryId: item.categoryId,
                                                            price: item.price.toString(),
                                                            unit: item.unit || "pax",
                                                            dietaryType: item.dietaryType || "veg",
                                                            description: item.description || "",
                                                            image: item.image || "",
                                                        })
                                                    }
                                                    className="p-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                                                >
                                                    <Pencil size={13} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                )}
            </Section>

            {editMenuItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900">Edit {editMenuItem.name}</h3>
                            <button onClick={() => setEditMenuItem(null)} className="p-2 rounded-lg hover:bg-gray-100">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Item Name</Label>
                                <Input
                                    value={editMenuItem.name}
                                    onChange={(e) => setEditMenuItem((p) => p && { ...p, name: e.target.value })}
                                    className={inputClass}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Description</Label>
                                <textarea
                                    value={editMenuItem.description}
                                    onChange={(e) => setEditMenuItem((p) => p && { ...p, description: e.target.value })}
                                    rows={2}
                                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500/20 resize-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">Price (₹)</Label>
                                    <Input
                                        type="number"
                                        value={editMenuItem.price}
                                        onChange={(e) => setEditMenuItem((p) => p && { ...p, price: e.target.value })}
                                        className={inputClass}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">Unit</Label>
                                    <select
                                        value={editMenuItem.unit}
                                        onChange={(e) => setEditMenuItem((p) => p && { ...p, unit: e.target.value })}
                                        className={cn("w-full px-3", inputClass)}
                                    >
                                        <option value="pax">Per Pax</option>
                                        <option value="plate">Per Plate</option>
                                        <option value="kg">Per Kg</option>
                                        <option value="pc">Per Piece</option>
                                        <option value="bottle">Per Bottle</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">Category</Label>
                                    <select
                                        value={editMenuItem.categoryId}
                                        onChange={(e) => setEditMenuItem((p) => p && { ...p, categoryId: e.target.value })}
                                        className={cn("w-full px-3", inputClass)}
                                    >
                                        {allCategories.map((cat: any) => (
                                            <option key={cat._id} value={cat._id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">Dietary Type</Label>
                                    <select
                                        value={editMenuItem.dietaryType}
                                        onChange={(e) => setEditMenuItem((p) => p && { ...p, dietaryType: e.target.value as any })}
                                        className={cn("w-full px-3", inputClass)}
                                    >
                                        <option value="veg">Veg</option>
                                        <option value="non-veg">Non-Veg</option>
                                        <option value="egg">Egg</option>
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Item Photo</Label>
                                <ImageUploader
                                    value={editMenuItem.image}
                                    onChange={(url) => setEditMenuItem((p) => p && { ...p, image: url })}
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 p-5 border-t border-gray-100">
                            <Button variant="outline" onClick={() => setEditMenuItem(null)} className="flex-1 rounded-xl">
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSaveMenuEdit}
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