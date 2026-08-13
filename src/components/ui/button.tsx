import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-brand-600 text-white hover:bg-brand-700",
        secondary: "bg-ink-100 text-ink-900 hover:bg-ink-200",
        outline: "border border-ink-300 bg-white text-ink-800 hover:bg-ink-100",
        ghost: "text-ink-700 hover:bg-ink-100",
        danger: "bg-danger-500 text-white hover:bg-danger-500/90",
        whatsapp: "bg-[#25D366] text-[#0b3d24] hover:bg-[#1fbe5b]",
        link: "text-brand-700 underline underline-offset-4 hover:text-brand-800",
      },
      size: {
        sm: "h-9 px-3 text-sm",
        md: "h-11 px-4 text-[0.95rem]",
        lg: "h-12 px-6 text-base",
        icon: "size-10",
      },
      block: {
        true: "w-full",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ className, variant, size, block, type = "button", ...props }, ref) {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(buttonVariants({ variant, size, block }), className)}
        {...props}
      />
    );
  },
);

export { buttonVariants };
