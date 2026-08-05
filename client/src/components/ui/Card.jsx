import React from "react";
import { motion } from "framer-motion";

export const Card = ({
  children,
  className = "",
  hover = false,
  glass = false,
  onClick,
  ...props
}) => {
  return (
    <motion.div
      whileHover={hover ? { y: -3, transition: { duration: 0.2 } } : {}}
      onClick={onClick}
      className={`rounded-2xl transition-all duration-200 ${
        glass
          ? "bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border border-white/40 dark:border-gray-800/60 shadow-lg shadow-gray-200/50 dark:shadow-none"
          : "bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800/80 shadow-md shadow-gray-200/40 dark:shadow-none"
      } ${onClick ? "cursor-pointer" : ""} ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
};
