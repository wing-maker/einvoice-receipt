import {
  Clock,
  CircleCheck,
  CircleAlert,
  TriangleAlert,
  CircleDashed,
  MinusCircle,
  type LucideIcon,
} from "lucide-react";
import type { WindowState } from "@/lib/dates";
import { stateLabel } from "@/lib/dates";
import { cn } from "@/lib/cn";

const META: Record<
  WindowState,
  { icon: LucideIcon; badge: string; dot: string }
> = {
  waiting: {
    icon: Clock,
    badge: "bg-surface-2 text-muted-foreground",
    dot: "bg-muted-foreground",
  },
  open: {
    icon: CircleCheck,
    badge: "bg-primary-soft text-primary",
    dot: "bg-primary",
  },
  due_soon: {
    icon: CircleAlert,
    badge: "bg-warning-soft text-warning",
    dot: "bg-warning",
  },
  overdue: {
    icon: TriangleAlert,
    badge: "bg-danger-soft text-danger",
    dot: "bg-danger",
  },
  registered: {
    icon: CircleCheck,
    badge: "bg-success-soft text-success",
    dot: "bg-success",
  },
  skipped: {
    icon: MinusCircle,
    badge: "bg-surface-2 text-muted-foreground",
    dot: "bg-muted-foreground",
  },
  unknown: {
    icon: CircleDashed,
    badge: "bg-warning-soft text-warning",
    dot: "bg-warning",
  },
};

export function statusMeta(state: WindowState) {
  return META[state];
}

export function StatusBadge({
  state,
  className,
}: {
  state: WindowState;
  className?: string;
}) {
  const { icon: Icon, badge } = META[state];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        badge,
        className,
      )}
    >
      <Icon size={13} strokeWidth={2.5} aria-hidden />
      {stateLabel(state)}
    </span>
  );
}
