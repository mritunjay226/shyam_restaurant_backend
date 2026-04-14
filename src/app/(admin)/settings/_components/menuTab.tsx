// components/settings/tabs/MenuTab.tsx

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { UtensilsCrossed, Plus, Pencil, X } from "lucide-react";
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
    category: string;
    subCategory: string;
    price: string;
    outlet: string;
    image: string;
};

const FOOD_SUB_CATEGORIES = ["Starters", "Main Course", "Breads", "Desserts", "Snacks", "Bakery"];
const BEVERAGE_SUB_CATEGORIES = ["Coffees", "Teas", "Beverages"];

function SubCategoryOptions({ category }: { category: string }) {
    const options = category === "Food" ? FOOD_SUB_CATEGORIES : BEVERAGE_SUB_CATEGORIES;
    return (
        <>
            {options.map((o) => (
                <option key={o}>{o}</option>
            ))}
        </>
    );
}

export function MenuTab() {
    const allMenuItems = useQuery(api.menuItems.getAllMenuItems) || [];
    const addMenu = useMutation(api.menuItems.addMenuItem);
    const updateMenuItem = useMutation(api.menuItems.updateMenuItem);

    const [newMenuItem, setNewMenuItem] = useState({
        name: "", category: "Food", subCategory: "Main Course", price: "", outlet: "restaurant", image: "",
    });
    const [editMenuItem, setEditMenuItem] = useState<EditMenuItem | null>(null);
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    const handleAddMenu = async () => {
        try {
            await addMenu({
                name: newMenuItem.name,
                category: newMenuItem.category,
                subCategory: newMenuItem.subCategory,
                price: parseInt(newMenuItem.price || "0"),
                outlet: newMenuItem.outlet,
                ...(newMenuItem.image && { image: newMenuItem.image }),
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
// hola amigo kaise ho thik ho
    return (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Section title="Add Menu Item" description="Add items to Restaurant or Café POS menus." icon={UtensilsCrossed}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5 sm:col-span-2">
                        <Label className="text-xs font-semibold">Item Name</Label>
                        <Input
                            placeholder="e.g. Masala Dosa"
                            value={newMenuItem.name}
                            onChange={(e) => setNewMenuItem((p) => ({ ...p, name: e.target.value }))}
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
                        <Label className="text-xs font-semibold">Outlet</Label>
                        <select
                            value={newMenuItem.outlet}
                            onChange={(e) => setNewMenuItem((p) => ({ ...p, outlet: e.target.value }))}
                            className={cn("w-full px-3", inputClass)}
                        >
                            <option value="restaurant">Restaurant</option>
                            <option value="cafe">Café</option>
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Category Type</Label>
                        <select
                            value={newMenuItem.category}
                            onChange={(e) => setNewMenuItem((p) => ({ ...p, category: e.target.value }))}
                            className={cn("w-full px-3", inputClass)}
                        >
                            <option>Food</option>
                            <option>Beverage</option>
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Sub Category</Label>
                        <select
                            value={newMenuItem.subCategory}
                            onChange={(e) => setNewMenuItem((p) => ({ ...p, subCategory: e.target.value }))}
                            className={cn("w-full px-3", inputClass)}
                        >
                            <SubCategoryOptions category={newMenuItem.category} />
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

            <Section title="Existing Menu Items" description="Click ✏️ to update price or photo." icon={UtensilsCrossed}>
                {allMenuItems.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">No menu items yet.</p>
                ) : (
                    <div className="space-y-1.5">
                        {["restaurant", "cafe"].map((outlet) => {
                            const items = allMenuItems.filter((i: any) => i.outlet === outlet);
                            if (!items.length) return null;
                            return (
                                <div key={outlet}>
                                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 mt-3">
                                        {outlet === "restaurant" ? "Restaurant" : "Café"}
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
                                                <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                                                <p className="text-xs text-gray-500">
                                                    {item.subCategory} · ₹{item.price}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() =>
                                                    setEditMenuItem({
                                                        _id: item._id,
                                                        name: item.name,
                                                        category: item.category,
                                                        subCategory: item.subCategory,
                                                        price: item.price.toString(),
                                                        outlet: item.outlet,
                                                        image: item.image || "",
                                                    })
                                                }
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
                                    <Label className="text-xs font-semibold">Category</Label>
                                    <select
                                        value={editMenuItem.category}
                                        onChange={(e) => setEditMenuItem((p) => p && { ...p, category: e.target.value })}
                                        className={cn("w-full px-3", inputClass)}
                                    >
                                        <option>Food</option>
                                        <option>Beverage</option>
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Sub Category</Label>
                                <select
                                    value={editMenuItem.subCategory}
                                    onChange={(e) => setEditMenuItem((p) => p && { ...p, subCategory: e.target.value })}
                                    className={cn("w-full px-3", inputClass)}
                                >
                                    <SubCategoryOptions category={editMenuItem.category} />
                                </select>
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