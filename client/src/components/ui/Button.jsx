import React from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

export const Button = ({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  isDisabled = false,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  className = "",
  type = "button",
  onClick,
  ...props
}) => {
  const baseStyles =
    "inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none";

  const variants = {
    primary:
      "bg-gradient-to-r from-primary via-blue-700 to-primary text-white hover:shadow-lg hover:shadow-primary/25 focus:ring-primary border border-transparent",
    secondary:
      "bg-secondary/10 text-secondary hover:bg-secondary/20 focus:ring-secondary border border-secondary/20",
    accent:
      "bg-accent text-accent-foreground hover:bg-accent/90 focus:ring-accent shadow-sm",
    outline:
      "border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 focus:ring-primary",
    ghost:
      "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 focus:ring-primary",
    destructive:
      "bg-gradient-to-r from-red-600 to-rose-600 text-white hover:shadow-lg hover:shadow-rose-600/25 focus:ring-rose-500",
    glass:
      "bg-white/70 dark:bg-gray-800/70 backdrop-blur-md border border-white/30 dark:border-gray-700/30 text-gray-800 dark:text-white hover:bg-white/90 dark:hover:bg-gray-800/90 shadow-sm",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs gap-1.5",
    md: "px-5 py-2.5 text-sm gap-2",
    lg: "px-6 py-3.5 text-base gap-2.5",
    xl: "px-8 py-4 text-lg gap-3",
  };

  return (
    <motion.button
      whileHover={!isDisabled && !isLoading ? { scale: 1.02 } : {}}
      whileTap={!isDisabled && !isLoading ? { scale: 0.98 } : {}}
      type={type}
      disabled={isDisabled || isLoading}
      onClick={onClick}
      className={`${baseStyles} ${variants[variant] || variants.primary} ${
        sizes[size] || sizes.md
      } ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-current" />
          <span>Processing...</span>
        </>
      ) : (
        <>
          {LeftIcon && <LeftIcon className="w-4 h-4 text-current shrink-0" />}
          <span>{children}</span>
          {RightIcon && <RightIcon className="w-4 h-4 text-current shrink-0" />}
        </>
      )}
    </motion.button>
  );
};
