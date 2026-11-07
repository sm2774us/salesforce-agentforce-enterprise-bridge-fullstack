import { cn } from "@/lib/utils";

export function JsonView({ value, className }: { value: unknown; className?: string }) {
  return (
    <pre className={cn("max-h-72 overflow-auto rounded-lg border border-white/10 bg-black/40 p-3 font-mono text-xs leading-relaxed text-cyan-100/90", className)}>
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}
