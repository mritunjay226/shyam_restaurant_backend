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
  const w = 80, h = 36;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  });
  const path = `M${pts.join(' L')}`;
  const fillPath = `M${pts[0]} L${pts.join(' L')} L${w},${h} L0,${h} Z`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
      <path d={fillPath} fill={color} fillOpacity="0.12" />
      <path d={path} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
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
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
    >
      <div className="bg-card rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300">
        <div className="flex items-start justify-between mb-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: iconBg }}
          >
            <Icon size={20} style={{ color: iconColor }} />
          </div>
          {sparkData && (
            <MiniSparkline data={sparkData} color={sparkColor} positive={trend !== undefined ? trend >= 0 : true} />
          )}
        </div>
        <div className="tabular-nums">
          <p className="text-2xl font-bold text-gray-900 leading-none">
            {prefix}
            {typeof displayed === "number" ? displayed.toLocaleString("en-IN") : displayed}
            {suffix}
          </p>
          <p className="text-sm text-gray-500 mt-1.5 font-medium">{label}</p>
        </div>
        {trend !== undefined && (
          <div className="mt-3 flex items-center gap-1.5">
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${trend >= 0 ? "text-green-700 bg-green-100" : "text-red-700 bg-red-100"}`}>
              {trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}%
            </span>
            <span className="text-xs text-gray-400">vs yesterday</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
