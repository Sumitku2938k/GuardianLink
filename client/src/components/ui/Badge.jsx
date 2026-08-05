import React from "react";

export const Badge = ({
  children,
  variant = "primary",
  size = "md",
  className = "",
  pulse = false,
  icon: Icon,
}) => {
  const variants = {
    primary: "bg-primary/10 text-primary border border-primary/20",
    secondary: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
    danger: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20",
    info: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20",
    neutral: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700",
  };

  const sizes = {
    sm: "px-2 py-0.5 text-[10px] font-semibold gap-1",
    md: "px-2.5 py-1 text-xs font-semibold gap-1.5",
    lg: "px-3 py-1.5 text-sm font-semibold gap-2",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full transition-colors ${
        variants[variant] || variants.primary
      } ${sizes[size] || sizes.md} ${className}`}
    >
      {pulse && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
        </span>
      )}
      {Icon && <Icon className="w-3.5 h-3.5" />}
      <span>{children}</span>
    </span>
  );
};
