import { Badge } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import type { OpenState } from "@/lib/hours/engine";

/**
 * Estado abierto/cerrado. Siempre calculado en el servidor: el navegador del
 * cliente puede tener cualquier zona horaria y cualquier reloj.
 */
export function OpenBadge({
  state,
  className,
  withDetail = false,
}: {
  state: OpenState;
  className?: string;
  withDetail?: boolean;
}) {
  const variant = state.isOpen
    ? "success"
    : state.closedReason === "SHABBAT" || state.closedReason === "HOLIDAY"
      ? "brand"
      : "neutral";

  return (
    <span className={cn("inline-flex flex-wrap items-center gap-2", className)}>
      <Badge variant={variant}>
        <span
          aria-hidden="true"
          className={cn(
            "size-1.5 rounded-full",
            state.isOpen ? "bg-success-500" : "bg-current opacity-60",
          )}
        />
        {state.shortLabel}
      </Badge>
      {withDetail && state.statusLabel !== state.shortLabel ? (
        <span className="text-xs text-ink-500">{state.statusLabel}</span>
      ) : null}
    </span>
  );
}
