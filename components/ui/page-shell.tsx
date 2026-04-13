import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const pageShellVariants = cva("w-full", {
  variants: {
    surface: {
      default: "bg-transparent",
      background: "bg-background text-foreground",
      muted: "bg-muted text-foreground",
      card: "bg-card text-card-foreground border border-border shadow-sm",
      accent: "bg-accent text-accent-foreground",
      popover: "bg-popover text-popover-foreground border border-border shadow-md",
    },
    padding: {
      none: "",
      sm: "p-3",
      md: "p-4 sm:p-6",
      lg: "p-6 sm:p-8",
    },
    rounded: {
      none: "",
      md: "rounded-md",
      lg: "rounded-lg",
      xl: "rounded-xl",
    },
    maxWidth: {
      full: "",
      content: "max-w-5xl mx-auto w-full",
      narrow: "max-w-3xl mx-auto w-full",
      prose: "max-w-2xl mx-auto w-full",
    },
  },
  defaultVariants: {
    surface: "default",
    padding: "none",
    rounded: "none",
    maxWidth: "full",
  },
});

type PageShellOwnProps = VariantProps<typeof pageShellVariants> & {
  as?: "div" | "section";
};

export type PageShellProps = PageShellOwnProps &
  Omit<React.HTMLAttributes<HTMLElement>, "color">;

const PageShell = React.forwardRef<HTMLElement, PageShellProps>(
  (
    {
      className,
      as = "div",
      surface,
      padding,
      rounded,
      maxWidth,
      ...props
    },
    ref,
  ) => {
    const Comp = as;
    return (
      <Comp
        ref={ref as React.Ref<HTMLDivElement & HTMLElement>}
        className={cn(
          pageShellVariants({ surface, padding, rounded, maxWidth }),
          className,
        )}
        {...props}
      />
    );
  },
);
PageShell.displayName = "PageShell";

export { PageShell, pageShellVariants };
