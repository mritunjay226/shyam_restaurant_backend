"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Plus, Trash2, Power, Terminal } from "lucide-react";
import { toast } from "sonner";

export function CountersTab() {
  const counters = useQuery(api.grocery.listCounters) || [];
  const addCounter = useMutation(api.grocery.addCounter);
  const toggleCounter = useMutation(api.grocery.toggleCounter);
  const removeCounter = useMutation(api.grocery.removeCounter);

  const [newName, setNewName] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setIsAdding(true);
    try {
      await addCounter({ name: newName.trim() });
      setNewName("");
      toast.success("Counter added successfully");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Terminal size={20} className="text-emerald-600" />
          POS Terminal Counters
        </h3>
        <p className="text-sm text-gray-500 mb-6">
          Create counters to sync grocery carts across multiple devices (e.g. Scanning on phone and billing on PC).
        </p>

        <div className="flex gap-2 mb-8">
          <input
            type="text"
            placeholder="Counter Name (e.g. Master Desk, Terminal 1)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
          />
          <button
            onClick={handleAdd}
            disabled={isAdding || !newName.trim()}
            className="px-6 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-all text-sm font-semibold flex items-center gap-2"
          >
            <Plus size={18} />
            Add Counter
          </button>
        </div>

        <div className="space-y-3">
          {counters.length === 0 ? (
            <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <p className="text-sm text-gray-400">No counters defined yet.</p>
            </div>
          ) : (
            counters.map((counter) => (
              <div
                key={counter._id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-emerald-200 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${counter.isActive ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-200 text-gray-500'}`}>
                    <Terminal size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">{counter.name}</h4>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Terminal ID: {counter._id.slice(-6)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleCounter({ counterId: counter._id, isActive: !counter.isActive })}
                    className={`p-2 rounded-xl transition-all ${
                      counter.isActive 
                        ? "bg-emerald-100 text-emerald-600 hover:bg-emerald-200" 
                        : "bg-gray-200 text-gray-500 hover:bg-gray-300"
                    }`}
                    title={counter.isActive ? "Deactivate" : "Activate"}
                  >
                    <Power size={18} />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("Delete this counter? Current active carts for this terminal will be lost.")) {
                        removeCounter({ counterId: counter._id });
                      }
                    }}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-amber-50 rounded-2xl border border-amber-100 p-6">
        <h4 className="font-bold text-amber-900 mb-2 flex items-center gap-2">
           Pro Tip: Real-time Sync
        </h4>
        <p className="text-sm text-amber-800 leading-relaxed">
          Open the Store POS on your PC and select a counter. Then open the same URL on your phone and choose the <b>same counter</b>. Any item you scan on your phone will instantly appear in the PC cart.
        </p>
      </div>
    </div>
  );
}
