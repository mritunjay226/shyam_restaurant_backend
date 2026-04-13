// components/settings/tabs/RoomsTab.tsx

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { BedDouble, Plus, Pencil, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { toast } from "sonner";
import { GalleryUploader } from "@/components/ImageUploader";
import { Section } from "./sections";

const inputClass = "rounded-xl border-gray-200 bg-gray-50 focus:bg-white transition-colors text-sm h-10";

type EditRoom = {
    _id: any;
    category: string;
    tariff: string;
    description: string;
    image: string;
    images: string[];
    amenities: string;
};

export function RoomsTab() {
    const allRooms = useQuery(api.rooms.getAllRooms) || [];
    const addRoom = useMutation(api.rooms.addRoom);
    const updateRoom = useMutation(api.rooms.updateRoom);

    const [newRoom, setNewRoom] = useState({
        number: "", category: "Standard", floor: "", tariff: "", image: "", images: [] as string[],
    });
    const [editRoom, setEditRoom] = useState<EditRoom | null>(null);
    const [isSavingEdit, setIsSavingEdit] = useState(false);

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
                amenities: editRoom.amenities
                    ? editRoom.amenities.split(",").map((s) => s.trim()).filter(Boolean)
                    : undefined,
            });
            toast.success("Room updated!");
            setEditRoom(null);
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setIsSavingEdit(false);
        }
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Section title="Add New Room" description="Register a new room to the property database." icon={BedDouble}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Room Number</Label>
                        <Input
                            placeholder="e.g. 101"
                            value={newRoom.number}
                            onChange={(e) => setNewRoom((p) => ({ ...p, number: e.target.value, floor: e.target.value.charAt(0) }))}
                            className={inputClass}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Category</Label>
                        <select
                            value={newRoom.category}
                            onChange={(e) => setNewRoom((p) => ({ ...p, category: e.target.value }))}
                            className={cn("w-full px-3", inputClass)}
                        >
                            <option>Standard</option>
                            <option>Premium</option>
                            <option>Luxury</option>
                            <option>Suite</option>
                        </select>
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                        <Label className="text-xs font-semibold">Tariff (₹/night)</Label>
                        <Input
                            type="number"
                            placeholder="0"
                            value={newRoom.tariff}
                            onChange={(e) => setNewRoom((p) => ({ ...p, tariff: e.target.value }))}
                            className={inputClass}
                        />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2 mt-1">
                        <Label className="text-xs font-semibold">Gallery Photos (will appear on room detail page)</Label>
                        <GalleryUploader
                            value={newRoom.images}
                            onChange={(urls) => setNewRoom((p) => ({ ...p, images: urls, image: urls[0] || "" }))}
                        />
                    </div>
                </div>
                <Button
                    onClick={handleAddRoom}
                    disabled={!newRoom.number || !newRoom.tariff}
                    className="w-full mt-4 bg-green-600 text-white rounded-xl h-10 gap-2 hover:bg-green-700"
                >
                    <Plus size={16} /> Create Room
                </Button>
            </Section>

            <Section title="Existing Rooms" description="Click ✏️ to edit photos, tariff, and description." icon={BedDouble}>
                {allRooms.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">No rooms added yet.</p>
                ) : (
                    <div className="space-y-2">
                        {allRooms.map((room) => (
                            <div
                                key={room._id}
                                className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-white transition-colors"
                            >
                                {room.image || room.images?.[0] ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={room.image || room.images?.[0]}
                                        alt={room.roomNumber}
                                        className="w-14 h-10 rounded-lg object-cover shrink-0 border border-gray-200"
                                    />
                                ) : (
                                    <div className="w-14 h-10 rounded-lg bg-gray-200 flex items-center justify-center shrink-0">
                                        <BedDouble size={14} className="text-gray-400" />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-gray-900">Room {room.roomNumber}</p>
                                    <p className="text-xs text-gray-500 capitalize">
                                        {room.category} · ₹{room.tariff}/night · {room.images?.length || (room.image ? 1 : 0)} photo(s)
                                    </p>
                                </div>
                                <button
                                    onClick={() =>
                                        setEditRoom({
                                            _id: room._id,
                                            category: room.category,
                                            tariff: room.tariff.toString(),
                                            description: room.description || "",
                                            image: room.image || "",
                                            images: room.images || (room.image ? [room.image] : []),
                                            amenities: (room.amenities || []).join(", "),
                                        })
                                    }
                                    className="p-2 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors shrink-0"
                                >
                                    <Pencil size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </Section>

            {editRoom && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900">
                                Edit Room {allRooms.find((r) => r._id === editRoom._id)?.roomNumber}
                            </h3>
                            <button onClick={() => setEditRoom(null)} className="p-2 rounded-lg hover:bg-gray-100">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">Category</Label>
                                    <select
                                        value={editRoom.category}
                                        onChange={(e) => setEditRoom((p) => p && { ...p, category: e.target.value })}
                                        className={cn("w-full px-3", inputClass)}
                                    >
                                        <option>standard</option>
                                        <option>premium</option>
                                        <option>luxury</option>
                                        <option>suite</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">Tariff (₹/night)</Label>
                                    <Input
                                        type="number"
                                        value={editRoom.tariff}
                                        onChange={(e) => setEditRoom((p) => p && { ...p, tariff: e.target.value })}
                                        className={inputClass}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Description</Label>
                                <textarea
                                    value={editRoom.description}
                                    onChange={(e) => setEditRoom((p) => p && { ...p, description: e.target.value })}
                                    rows={2}
                                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500/20 resize-none"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Amenities (comma-separated)</Label>
                                <Input
                                    value={editRoom.amenities}
                                    onChange={(e) => setEditRoom((p) => p && { ...p, amenities: e.target.value })}
                                    placeholder="AC, WiFi, TV, King Bed"
                                    className={inputClass}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Gallery Photos (first = hero image)</Label>
                                <GalleryUploader
                                    value={editRoom.images}
                                    onChange={(urls) => setEditRoom((p) => p && { ...p, images: urls, image: urls[0] || "" })}
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 p-5 border-t border-gray-100">
                            <Button variant="outline" onClick={() => setEditRoom(null)} className="flex-1 rounded-xl">
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSaveRoomEdit}
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