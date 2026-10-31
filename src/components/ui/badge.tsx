import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.08em] whitespace-nowrap [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "border-white/10 bg-white/[0.04] text-muted-foreground",
        model: "border-model/30 bg-model/10 text-model-soft",
        modal: "border-modal/30 bg-modal/10 text-modal-soft",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Badge({ className, variant, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
