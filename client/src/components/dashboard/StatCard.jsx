import React from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";

export const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  colorScheme = "blue",
}) => {
  const schemes = {
    blue: {
      bg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
      iconBg: "bg-gradient-to-br from-primary to-blue-600 text-white",
      glow: "hover:shadow-blue-500/10",
    },
    teal: {
      bg: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
      iconBg: "bg-gradient-to-br from-teal-500 to-emerald-600 text-white",
      glow: "hover:shadow-teal-500/10",
    },
    rose: {
      bg: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
      iconBg: "bg-gradient-to-br from-rose-500 to-red-600 text-white",
      glow: "hover:shadow-rose-500/10",
    },
    amber: {
      bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      iconBg: "bg-gradient-to-br from-amber-500 to-orange-600 text-white",
      glow: "hover:shadow-amber-500/10",
    },
  };

  const currentScheme = schemes[colorScheme] || schemes.blue;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className={`p-6 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-xl shadow-gray-200/50 dark:shadow-none transition-all ${currentScheme.glow}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          {title}
        </span>
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-md ${currentScheme.iconBg}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="mt-4 flex items-baseline justify-between">
        <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
          {value}
        </h3>

        {trendValue && (
          <div
            className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border ${
              trend === "up"
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
            }`}
          >
            {trend === "up" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            <span>{trendValue}</span>
          </div>
        )}
      </div>

      {subtitle && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 font-medium">
          {subtitle}
        </p>
      )}
    </motion.div>
  );
};
