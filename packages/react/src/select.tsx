import type { SelectHTMLAttributes } from "react";

/**
 * OpenUI Select — framework-native, zero runtime dependencies.
 *
 * A native `<select>` with a consistent field appearance and a decorative
 * chevron. Children are passed directly to the select element.
 */

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

const BASE_CLASSES =
  "flex h-10 w-full appearance-none rounded-md border bg-white py-2 pr-9 pl-3 text-sm text-zinc-900 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-950 dark:text-zinc-50 dark:focus-visible:ring-zinc-600 dark:focus-visible:ring-offset-zinc-950";

const BORDER_CLASSES = "border-zinc-300 dark:border-zinc-700";
const INVALID_CLASSES = "border-red-500 dark:border-red-400";

function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function Select({ invalid = false, className, children, ...props }: SelectProps) {
  return (
    <div className="relative">
      <select
        aria-invalid={invalid || undefined}
        className={cn(BASE_CLASSES, invalid ? INVALID_CLASSES : BORDER_CLASSES, className)}
        {...props}
      >
        {children}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-zinc-500 dark:text-zinc-400"
      >
        <path
          fillRule="evenodd"
          d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
          clipRule="evenodd"
        />
      </svg>
    </div>
  );
}
