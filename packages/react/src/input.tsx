import type { InputHTMLAttributes } from "react";

/**
 * OpenUI Input — framework-native, zero runtime dependencies.
 *
 * A native text input with shared field styling and an invalid state.
 */

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

const BASE_CLASSES =
  "flex h-10 w-full rounded-md border bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm transition-colors placeholder:text-zinc-500 file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-400 dark:focus-visible:ring-zinc-600 dark:focus-visible:ring-offset-zinc-950";

const BORDER_CLASSES = "border-zinc-300 dark:border-zinc-700";
const INVALID_CLASSES = "border-red-500 dark:border-red-400";

function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function Input({ invalid = false, className, ...props }: InputProps) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cn(BASE_CLASSES, invalid ? INVALID_CLASSES : BORDER_CLASSES, className)}
      {...props}
    />
  );
}
