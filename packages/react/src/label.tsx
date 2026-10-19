import type { LabelHTMLAttributes } from "react";

/**
 * OpenUI Label — framework-native, zero runtime dependencies.
 *
 * A native label with form typography. Pass `htmlFor` to associate it with a
 * control, or wrap the control directly.
 */

export type LabelProps = LabelHTMLAttributes<HTMLLabelElement>;

const BASE_CLASSES =
  "text-sm font-medium leading-none text-zinc-900 peer-disabled:cursor-not-allowed peer-disabled:opacity-70 dark:text-zinc-50";

function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function Label({ className, ...props }: LabelProps) {
  // `Label` is a generic primitive: association is the caller's responsibility
  // via `htmlFor` or by wrapping the control as children.
  // oxlint-disable-next-line jsx-a11y/label-has-associated-control -- see above.
  return <label className={cn(BASE_CLASSES, className)} {...props} />;
}
