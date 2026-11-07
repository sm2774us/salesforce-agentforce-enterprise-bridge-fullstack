import { AlertOctagon, AlertTriangle, CheckCircle2, Clock3, Info, ShieldAlert, ShieldX, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/primitives";
import type { Decision, Severity } from "@/lib/types";

const SEV = {
  low: { tone: "green", icon: Info },
  medium: { tone: "amber", icon: AlertTriangle },
  high: { tone: "orange", icon: ShieldAlert },
  critical: { tone: "red", icon: AlertOctagon },
} as const;

export function SeverityBadge({ severity }: { severity: Severity }) {
  const { tone, icon: Icon } = SEV[severity];
  return (
    <Badge tone={tone} data-testid={`sev-${severity}`}>
      <Icon className="h-3 w-3" />
      {severity}
    </Badge>
  );
}

const DEC = {
  executed: { tone: "green", icon: CheckCircle2, label: "Executed" },
  pending_approval: { tone: "amber", icon: Clock3, label: "Pending approval" },
  denied: { tone: "red", icon: ShieldX, label: "Denied" },
  rejected: { tone: "orange", icon: XCircle, label: "Rejected" },
  failed: { tone: "red", icon: AlertOctagon, label: "Failed" },
} as const;

export function DecisionBadge({ decision }: { decision: Decision }) {
  const { tone, icon: Icon, label } = DEC[decision];
  return (
    <Badge tone={tone} data-testid={`decision-${decision}`}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}

export const DECISION_COLORS: Record<Decision, string> = {
  executed: "#34d399",
  pending_approval: "#fbbf24",
  denied: "#fb4f6b",
  rejected: "#fb923c",
  failed: "#c084fc",
};

export const RiskBadge = ({ risk }: { risk: "low" | "high" }) => (
  <Badge tone={risk === "high" ? "red" : "green"}>{risk} risk</Badge>
);
