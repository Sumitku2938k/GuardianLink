import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export const Input = React.forwardRef(
  (
    {
      label,
      type = "text",
      error,
      helperText,
      icon: Icon,
      rightElement,
      className = "",
      containerClassName = "",
      id,
      required = false,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPasswordType = type === "password";
    const actualType = isPasswordType ? (showPassword ? "text" : "password") : type;

    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className={`w-full flex flex-col gap-1.5 ${containerClassName}`}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center justify-between"
          >
            <span>
              {label} {required && <span className="text-rose-500">*</span>}
            </span>
          </label>
        )}

        <div className="relative flex items-center">
          {Icon && (
            <div className="absolute left-3.5 z-10 text-gray-400 pointer-events-none flex items-center justify-center">
              <Icon className="w-5 h-5" />
            </div>
          )}

          <input
            id={inputId}
            ref={ref}
            type={actualType}
            className={`w-full py-3 text-sm rounded-xl transition-all duration-200 
              bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm 
              text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 
              border ${
                error
                  ? "border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                  : "border-gray-200 dark:border-gray-800 focus:border-primary dark:focus:border-primary focus:ring-2 focus:ring-primary/20"
              } 
              ${Icon ? "pl-11" : "pl-4"} 
              ${isPasswordType || rightElement ? "pr-11" : "pr-4"} 
              outline-none ${className}`}
            {...props}
          />

          {isPasswordType ? (
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 z-10 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors focus:outline-none focus:text-primary"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          ) : (
            rightElement && <div className="absolute right-3.5 z-10">{rightElement}</div>
          )}
        </div>

        {error && <span className="text-xs text-rose-500 font-medium pl-1">{error}</span>}
        {!error && helperText && (
          <span className="text-xs text-gray-500 dark:text-gray-400 pl-1">{helperText}</span>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
