import type { ReactNode } from "react";
import { useId } from "react";

/**
 * OpenUI Field — framework-native, zero runtime dependencies.
 *
 * Composes a label, a control, and a hint or error message with the wiring a
 * form control needs: `htmlFor`/`id`, `aria-describedby`, and `aria-invalid`.
 * Pass a function as `children` to receive `controlProps`, an object that can
 * be spread directly onto any control:
 *
 *   <Field label="Email" error={message}>
 *     {({ controlProps }) => <Input {...controlProps} />}
 *   </Field>
 */

export interface FieldControlProps {
  id: string;
  "aria-describedby": string | undefined;
  "aria-invalid": true | undefined;
}

export interface FieldRenderProps {
  controlProps: FieldControlProps;
}

export interface FieldProps {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  id?: string;
  className?: string;
  children?: ReactNode | ((props: FieldRenderProps) => ReactNode);
}

export function Field({ label, hint, error, id, className, children }: FieldProps) {
  const generatedId = useId();
  const controlId = id ?? `field-${generatedId}`;
  const hintId = hint ? `${controlId}-hint` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  const renderProps: FieldRenderProps = {
    controlProps: {
      id: controlId,
      "aria-describedby": describedBy,
      "aria-invalid": error ? true : undefined,
    },
  };

  return (
    <div className={["flex flex-col gap-2", className].filter(Boolean).join(" ")}>
      <label
        htmlFor={controlId}
        className="text-sm font-medium leading-none text-zinc-900 dark:text-zinc-50"
      >
        {label}
      </label>
      {typeof children === "function" ? children(renderProps) : children}
      {hint ? (
        <p id={hintId} className="text-xs text-zinc-500 dark:text-zinc-400">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-xs font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}
