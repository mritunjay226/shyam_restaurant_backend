"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Terminal, ArrowRight, Store } from "lucide-react";
import { motion } from "framer-motion";

interface CounterSelectorProps {
  onSelect: (counterId: any, counterName: string) => void;
}

export function CounterSelector({ onSelect }: CounterSelectorProps) {
  const counters = useQuery(api.grocery.listCounters) || [];
  const activeCounters = counters.filter(c => c.isActive);

  return (
    <div className="fixed inset-0 z-100 bg-white/80 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-[32px] border border-gray-100 shadow-2xl max-w-lg w-full overflow-hidden"
      >
        <div className="bg-emerald-600 p-8 text-white text-center sm:text-left">
          <div className="flex justify-center sm:justify-start mb-4">
             <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <Store size={28} />
             </div>
          </div>
          <h2 className="text-3xl font-black tracking-tight mb-2">Select Counter</h2>
          <p className="opacity-80 text-sm">Choose your terminal to start managing inventory and sales in real-time.</p>
        </div>

        <div className="p-8">
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {activeCounters.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-gray-500 text-sm italic">No active counters found.</p>
                <p className="text-xs text-gray-400 mt-2">Please activate counters in Settings first.</p>
              </div>
            ) : (
              activeCounters.map((counter) => (
                <button
                  key={counter._id}
                  onClick={() => onSelect(counter._id, counter.name)}
                  className="w-full flex items-center justify-between p-5 bg-gray-50 hover:bg-emerald-50 rounded-2xl border border-transparent hover:border-emerald-200 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                      <Terminal size={24} />
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-gray-900 text-lg">{counter.name}</div>
                      <div className="text-xs text-gray-400 uppercase tracking-widest font-semibold italic">Terminal Ready</div>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-300 group-hover:text-emerald-600 group-hover:bg-emerald-100 transition-all">
                    <ArrowRight size={20} />
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100 italic text-[10px] text-gray-400 text-center uppercase tracking-widest">
            Multi-Terminal Real-time Synchronization Active
          </div>
        </div>
      </motion.div>
    </div>
  );
}
