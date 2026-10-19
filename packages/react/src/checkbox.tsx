import type { InputHTMLAttributes } from "react";

/**
 * OpenUI Checkbox — framework-native, zero runtime dependencies.
 *
 * A native checkbox. Pair it with Label when the text should be clickable.
 */

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  invalid?: boolean;
}

const BASE_CLASSES =
  "size-4 shrink-0 cursor-pointer rounded border-zinc-300 accent-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:accent-zinc-50 dark:focus-visible:ring-zinc-600 dark:focus-visible:ring-offset-zinc-950";

const INVALID_CLASSES = "outline outline-1 outline-red-500 dark:outline-red-400";

function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function Checkbox({ invalid = false, className, ...props }: CheckboxProps) {
  return (
    <input
      type="checkbox"
      aria-invalid={invalid || undefined}
      className={cn(BASE_CLASSES, invalid && INVALID_CLASSES, className)}
      {...props}
    />
  );
}
