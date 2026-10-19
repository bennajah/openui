import type { TextareaHTMLAttributes } from "react";

/**
 * OpenUI Textarea — framework-native, zero runtime dependencies.
 *
 * A native multi-line input with the same field treatment as Input.
 */

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

const BASE_CLASSES =
  "flex min-h-20 w-full rounded-md border bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm transition-colors placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-400 dark:focus-visible:ring-zinc-600 dark:focus-visible:ring-offset-zinc-950";

const BORDER_CLASSES = "border-zinc-300 dark:border-zinc-700";
const INVALID_CLASSES = "border-red-500 dark:border-red-400";

function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function Textarea({ invalid = false, className, rows = 4, ...props }: TextareaProps) {
  return (
    <textarea
      aria-invalid={invalid || undefined}
      rows={rows}
      className={cn(BASE_CLASSES, invalid ? INVALID_CLASSES : BORDER_CLASSES, className)}
      {...props}
    />
  );
}
