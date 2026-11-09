import * as React from "react";
import { cn } from "../lib/utils";

export interface SwitchProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  (
    { className, checked, defaultChecked, onCheckedChange, disabled, onClick, ...props },
    ref
  ) => {
    const [inner, setInner] = React.useState(!!defaultChecked);
    const isControlled = checked !== undefined;
    const value = isControlled ? !!checked : inner;
    return (
      <button
        type="button"
        role="switch"
        aria-checked={value}
        data-state={value ? "checked" : "unchecked"}
        disabled={disabled}
        ref={ref}
        onClick={(e) => {
          onClick?.(e);
          if (e.defaultPrevented) return;
          const next = !value;
          if (!isControlled) setInner(next);
          onCheckedChange?.(next);
        }}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50",
          value ? "bg-green-500" : "bg-neutral-500",
          className
        )}
        {...props}
      >
        <span
          className={cn(
            "pointer-events-none block h-5 w-5 rounded-full bg-white shadow transition-transform",
            value ? "translate-x-5" : "translate-x-0.5"
          )}
        />
      </button>
    );
  }
);
Switch.displayName = "Switch";
