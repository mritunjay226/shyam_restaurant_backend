"use client";

import { useEffect, useState } from "react";
import { motion, animate } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface MiniSparklineProps {
  data: number[];
  color: string;
  positive?: boolean;
}

function MiniSparkline({ data, color, positive = true }: MiniSparklineProps) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 64, h = 28;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  });
  const path = `M${pts.join(' L')}`;
  const fillPath = `M${pts[0]} L${pts.join(' L')} L${w},${h} L0,${h} Z`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" className="opacity-80 group-hover:opacity-100 transition-opacity">
      <path d={fillPath} fill={color} fillOpacity="0.12" />
      <path d={path} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

interface StatCardProps {
  label: string;
  value: number | string;
  prefix?: string;
  suffix?: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  trend?: number;
  sparkData?: number[];
  sparkColor?: string;
  delay?: number;
  animate?: boolean;
}

export function StatCard({
  label, value, prefix = "", suffix = "", icon: Icon,
  iconBg, iconColor, trend, sparkData, sparkColor = "#16A34A",
  delay = 0, animate: shouldAnimate = true
}: StatCardProps) {
  const [displayed, setDisplayed] = useState(typeof value === "number" ? 0 : value);

  useEffect(() => {
    if (typeof value === "number" && shouldAnimate) {
      const ctrl = animate(0, value, {
        duration: 1.4,
        ease: "easeOut",
        onUpdate: v => setDisplayed(Math.floor(v)),
      });
      return () => ctrl.stop();
    } else {
      setDisplayed(value);
    }
  }, [value, shouldAnimate]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="h-full"
    >
      <div className="bg-white rounded-[24px] p-4 sm:p-5 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] border border-gray-100 hover:shadow-md transition-all duration-300 h-full flex flex-col justify-between group">
        <div>
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center shrink-0 shadow-sm"
              style={{ backgroundColor: iconBg }}
            >
              <Icon size={18} style={{ color: iconColor }} className="sm:w-5 sm:h-5" />
            </div>
            {sparkData && (
              <MiniSparkline data={sparkData} color={sparkColor} positive={trend !== undefined ? trend >= 0 : true} />
            )}
          </div>
          
          <div className="tabular-nums">
            <p className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight leading-none">
              {prefix}
              {typeof displayed === "number" ? displayed.toLocaleString("en-IN") : displayed}
              {suffix}
            </p>
            <p className="text-[#8B95A5] text-[12px] sm:text-[13px] mt-1.5 sm:mt-2 font-semibold leading-snug">
              {label}
            </p>
          </div>
        </div>

        {trend !== undefined && (
          <div className="mt-3 sm:mt-4 flex items-center gap-1.5 opacity-95">
            <span className={`text-[10px] sm:text-[11px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 ${trend >= 0 ? "text-emerald-700 bg-emerald-100/70" : "text-rose-700 bg-rose-100/70"}`}>
              {trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}%
            </span>
            <span className="text-[10px] sm:text-[11px] text-gray-400 font-medium">vs yesterday</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
