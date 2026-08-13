"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { copy } from "@/lib/copy";
import { cn } from "@/lib/utils";
import { idleState, type ActionState } from "@/lib/admin/form";

type Action = (state: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * Envoltorio de formularios del panel: estado de la acción, mensaje de
 * resultado y botón con estado de envío. Los hijos reciben los errores por
 * campo para pintarlos donde corresponde.
 */
export function ActionForm({
  action,
  children,
  submitLabel = copy.admin.common.save,
  pendingLabel = copy.admin.common.saving,
  className,
  variant = "primary",
  size,
  confirm,
  hideSubmit = false,
}: {
  action: Action;
  children?: React.ReactNode | ((state: ActionState) => React.ReactNode);
  submitLabel?: string;
  pendingLabel?: string;
  className?: string;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  confirm?: string;
  hideSubmit?: boolean;
}) {
  const [state, formAction, isPending] = useActionState(action, idleState);

  return (
    <form
      action={formAction}
      className={cn("space-y-4", className)}
      onSubmit={(event) => {
        if (confirm && !window.confirm(confirm)) event.preventDefault();
      }}
    >
      {typeof children === "function" ? children(state) : children}

      {state.message ? (
        <Alert variant={state.ok ? "success" : "danger"}>{state.message}</Alert>
      ) : null}

      {hideSubmit ? null : (
        <Button type="submit" variant={variant} size={size} disabled={isPending}>
          {isPending ? pendingLabel : submitLabel}
        </Button>
      )}
    </form>
  );
}

/** Botón suelto que dispara una acción (aprobar, suspender, eliminar). */
export function ActionButton({
  action,
  label,
  fields,
  variant = "outline",
  size = "sm",
  confirm,
}: {
  action: Action;
  label: string;
  fields: Record<string, string>;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  confirm?: string;
}) {
  const [state, formAction, isPending] = useActionState(action, idleState);

  return (
    <form
      action={formAction}
      className="inline-flex flex-col gap-1"
      onSubmit={(event) => {
        if (confirm && !window.confirm(confirm)) event.preventDefault();
      }}
    >
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <Button type="submit" variant={variant} size={size} disabled={isPending}>
        {isPending ? "…" : label}
      </Button>
      {state.message && !state.ok ? (
        <span className="text-xs text-danger-500">{state.message}</span>
      ) : null}
    </form>
  );
}
