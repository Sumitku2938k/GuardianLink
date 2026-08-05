import React from "react";

export const Skeleton = ({ className = "", ...props }) => {
  return (
    <div
      className={`animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800 ${className}`}
      {...props}
    />
  );
};
