import type { InputHTMLAttributes } from "react";

/**
 * OpenUI Radio — framework-native, zero runtime dependencies.
 *
 * A native radio input. Give inputs in the same group the same `name` and pair
 * them with Label for a clickable caption.
 */

export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  /** Renders an error outline. `aria-invalid` is not valid on `role="radio"`. */
  invalid?: boolean;
}

const BASE_CLASSES =
  "size-4 shrink-0 cursor-pointer accent-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:accent-zinc-50 dark:focus-visible:ring-zinc-600 dark:focus-visible:ring-offset-zinc-950";

const INVALID_CLASSES = "outline outline-1 outline-red-500 dark:outline-red-400";

function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function Radio({ invalid = false, className, ...props }: RadioProps) {
  return (
    <input
      type="radio"
      data-invalid={invalid || undefined}
      className={cn(BASE_CLASSES, invalid && INVALID_CLASSES, className)}
      {...props}
    />
  );
}
