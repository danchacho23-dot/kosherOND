import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] border border-ink-200 bg-white shadow-[0_1px_2px_rgba(26,23,19,0.04)]",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-1 p-5 pb-3", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 className={cn("text-lg font-semibold text-ink-900", className)} {...props} />
  );
}

export function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-ink-500", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 pt-0", className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center gap-2 p-5 pt-0", className)} {...props} />;
}

// ---------------------------------------------------------------------------
// Badge
// ---------------------------------------------------------------------------

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      variant: {
        neutral: "bg-ink-100 text-ink-700",
        brand: "bg-brand-100 text-brand-800",
        success: "bg-success-100 text-success-500",
        warning: "bg-accent-100 text-accent-500",
        danger: "bg-danger-100 text-danger-500",
        outline: "border border-ink-300 text-ink-600",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

// ---------------------------------------------------------------------------
// Campos de formulario
// ---------------------------------------------------------------------------

const fieldStyles =
  "w-full rounded-lg border border-ink-300 bg-white px-3 py-2.5 text-[0.95rem] text-ink-900 placeholder:text-ink-400 disabled:bg-ink-100 disabled:text-ink-500 aria-[invalid=true]:border-danger-500";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(fieldStyles, className)} {...props} />;
  },
);

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea ref={ref} className={cn(fieldStyles, "min-h-24", className)} {...props} />
  );
});

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, ...props }, ref) {
  return (
    <select ref={ref} className={cn(fieldStyles, "appearance-none pr-8", className)} {...props} />
  );
});

export function Label({
  className,
  required,
  children,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }) {
  return (
    <label className={cn("block text-sm font-medium text-ink-800", className)} {...props}>
      {children}
      {required ? (
        <span className="ml-0.5 text-danger-500" aria-hidden="true">
          *
        </span>
      ) : null}
    </label>
  );
}

export function FieldHint({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("mt-1 text-xs text-ink-500", className)} {...props} />;
}

export function FieldError({ children, id }: { children?: React.ReactNode; id?: string }) {
  if (!children) return null;
  return (
    <p id={id} className="mt-1 text-xs font-medium text-danger-500" role="alert">
      {children}
    </p>
  );
}

/** Campo completo: label + control + ayuda + error, con los aria enlazados. */
export function Field({
  id,
  label,
  hint,
  error,
  required,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div>
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      <div className="mt-1.5">
        {React.isValidElement(children)
          ? React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
              id,
              "aria-describedby": [hintId, errorId].filter(Boolean).join(" ") || undefined,
              "aria-invalid": error ? true : undefined,
            })
          : children}
      </div>
      {hint ? <FieldHint id={hintId}>{hint}</FieldHint> : null}
      <FieldError id={errorId}>{error}</FieldError>
    </div>
  );
}

export function Checkbox({
  className,
  label,
  id,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <input
        id={id}
        type="checkbox"
        className={cn(
          "mt-0.5 size-4 shrink-0 rounded border-ink-400 text-brand-600 accent-brand-600",
          className,
        )}
        {...props}
      />
      <label htmlFor={id} className="text-sm text-ink-700">
        {label}
      </label>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Estados
// ---------------------------------------------------------------------------

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-lg bg-ink-200", className)}
      aria-hidden="true"
      {...props}
    />
  );
}

export function EmptyState({
  title,
  body,
  action,
  icon,
}: {
  title: string;
  body?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-[var(--radius-card)] border border-dashed border-ink-300 bg-white px-6 py-12 text-center">
      {icon ? <div className="mb-3 text-ink-400">{icon}</div> : null}
      <p className="text-base font-medium text-ink-800">{title}</p>
      {body ? <p className="mt-1 max-w-sm text-sm text-ink-500">{body}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function Alert({
  variant = "neutral",
  title,
  children,
}: {
  variant?: "neutral" | "warning" | "danger" | "success";
  title?: string;
  children: React.ReactNode;
}) {
  const styles = {
    neutral: "border-ink-200 bg-ink-100 text-ink-700",
    warning: "border-accent-500/30 bg-accent-100 text-accent-500",
    danger: "border-danger-500/30 bg-danger-100 text-danger-500",
    success: "border-success-500/30 bg-success-100 text-success-500",
  } as const;
  return (
    <div
      className={cn("rounded-lg border px-4 py-3 text-sm", styles[variant])}
      role={variant === "danger" ? "alert" : undefined}
    >
      {title ? <p className="font-semibold">{title}</p> : null}
      <div className={title ? "mt-1" : undefined}>{children}</div>
    </div>
  );
}
