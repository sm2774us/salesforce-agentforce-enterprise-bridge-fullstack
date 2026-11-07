import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Dialog as D, Tooltip as T } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/* ---------- Button ---------- */
const button = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:pointer-events-none disabled:opacity-40 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-cyan-400 to-indigo-500 text-slate-950 shadow-[0_0_24px_-6px_rgba(34,211,238,.6)] hover:brightness-110",
        secondary: "bg-white/[0.06] text-foreground border border-white/10 hover:bg-white/10",
        ghost: "text-muted hover:text-foreground hover:bg-white/[0.06]",
        success: "bg-emerald-500/90 text-emerald-950 hover:bg-emerald-400",
        danger: "bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25",
      },
      size: { sm: "h-8 px-3", md: "h-9 px-4", lg: "h-11 px-6 text-base", icon: "h-9 w-9" },
    },
    defaultVariants: { variant: "default", size: "md" },
  },
);
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {}
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = "button", ...p }, ref) => (
    <button ref={ref} type={type} className={cn(button({ variant, size }), className)} {...p} />
  ),
);
Button.displayName = "Button";

/* ---------- Card ---------- */
export const Card = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("glass rounded-2xl", className)} {...p} />
);
export const CardHeader = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex items-start justify-between gap-3 px-5 pt-5", className)} {...p} />
);
export const CardTitle = ({ className, ...p }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn("text-sm font-semibold tracking-wide text-foreground", className)} {...p} />
);
export const CardDescription = ({ className, ...p }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn("mt-0.5 text-xs text-muted", className)} {...p} />
);
export const CardBody = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("p-5", className)} {...p} />
);

/* ---------- Badge ---------- */
const badge = cva(
  "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
  {
    variants: {
      tone: {
        neutral: "border-white/10 bg-white/5 text-muted",
        cyan: "border-cyan-400/30 bg-cyan-400/10 text-cyan-300",
        indigo: "border-indigo-400/30 bg-indigo-400/10 text-indigo-300",
        green: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
        amber: "border-amber-400/30 bg-amber-400/10 text-amber-300",
        orange: "border-orange-400/30 bg-orange-400/10 text-orange-300",
        red: "border-rose-400/30 bg-rose-400/10 text-rose-300",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);
export const Badge = ({
  className, tone, ...p
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badge>) => (
  <span className={cn(badge({ tone }), className)} {...p} />
);

/* ---------- Inputs ---------- */
const field =
  "w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm text-foreground placeholder:text-muted/60 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50";
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...p }, ref) => <input ref={ref} className={cn(field, "h-9", className)} {...p} />,
);
Input.displayName = "Input";
export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...p }, ref) => <textarea ref={ref} className={cn(field, "min-h-20 py-2", className)} {...p} />,
);
Textarea.displayName = "Textarea";
export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...p }, ref) => <select ref={ref} className={cn(field, "h-9 [&>option]:bg-card", className)} {...p} />,
);
Select.displayName = "Select";
export const Label = ({ className, ...p }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
  <label className={cn("mb-1.5 block text-xs font-medium text-muted", className)} {...p} />
);

export const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn("animate-pulse rounded-lg bg-white/[0.06]", className)} />
);

/* ---------- Dialog ---------- */
export function Dialog({
  open, onOpenChange, title, description, children, className,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
        <D.Content
          aria-describedby={description ? undefined : undefined}
          className={cn(
            "glass fixed left-1/2 top-1/2 z-50 max-h-[88vh] w-[min(92vw,640px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-card p-6 shadow-2xl",
            className,
          )}
        >
          <D.Title className="text-lg font-semibold">{title}</D.Title>
          {description ? (
            <D.Description className="mt-1 text-sm text-muted">{description}</D.Description>
          ) : (
            <D.Description className="sr-only">{title}</D.Description>
          )}
          <div className="mt-4">{children}</div>
          <D.Close
            aria-label="Close"
            className="absolute right-4 top-4 rounded-md p-1 text-muted hover:bg-white/10 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </D.Close>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}

/* ---------- Tooltip ---------- */
export function Tip({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <T.Provider delayDuration={150}>
      <T.Root>
        <T.Trigger asChild>{children}</T.Trigger>
        <T.Portal>
          <T.Content
            sideOffset={6}
            className="z-[60] max-w-xs rounded-md border border-white/10 bg-elevated px-2.5 py-1.5 text-xs text-foreground shadow-xl"
          >
            {label}
          </T.Content>
        </T.Portal>
      </T.Root>
    </T.Provider>
  );
}

export const EmptyState = ({
  icon, title, hint, action,
}: { icon: React.ReactNode; title: string; hint?: string; action?: React.ReactNode }) => (
  <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
    <div className="grid h-12 w-12 place-items-center rounded-xl bg-white/5 text-muted">{icon}</div>
    <p className="text-sm font-medium">{title}</p>
    {hint && <p className="max-w-sm text-xs text-muted">{hint}</p>}
    {action}
  </div>
);
