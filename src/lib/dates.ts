import type { Receipt } from "./types";

// The registration "window state" a receipt is in, right now.
// This is the core concept of the app: you can only register a receipt
// AFTER the merchant syncs it (open date) and BEFORE the deadline.
export type WindowState =
  | "waiting" // too early — merchant hasn't synced yet
  | "open" // register now, comfortably within window
  | "due_soon" // window closing within DUE_SOON_DAYS
  | "overdue" // deadline passed, not registered
  | "registered" // done
  | "skipped" // user chose to skip
  | "unknown"; // missing date info

export const DUE_SOON_DAYS = 3;

/** Parse a YYYY-MM-DD string into a local Date at midnight. */
export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayLocal(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

/**
 * The date the registration window opens: an explicit open date if we have one,
 * otherwise purchase date + wait days.
 */
export function openDateOf(receipt: Receipt): Date | null {
  const explicit = parseDate(receipt.register_open_date);
  if (explicit) return explicit;
  const purchase = parseDate(receipt.purchase_date);
  if (purchase && receipt.wait_days != null) {
    return addDays(purchase, receipt.wait_days);
  }
  return null;
}

export function deadlineOf(receipt: Receipt): Date | null {
  return parseDate(receipt.register_deadline);
}

export interface WindowInfo {
  state: WindowState;
  open: Date | null;
  deadline: Date | null;
  /** Days until the window opens (>=0 when waiting). */
  daysUntilOpen: number | null;
  /** Days until the deadline (can be negative when overdue). */
  daysUntilDeadline: number | null;
}

export function computeWindow(receipt: Receipt, today = todayLocal()): WindowInfo {
  const open = openDateOf(receipt);
  const deadline = deadlineOf(receipt);
  const daysUntilOpen = open ? daysBetween(today, open) : null;
  const daysUntilDeadline = deadline ? daysBetween(today, deadline) : null;

  if (receipt.status === "registered") {
    return { state: "registered", open, deadline, daysUntilOpen, daysUntilDeadline };
  }
  if (receipt.status === "skipped") {
    return { state: "skipped", open, deadline, daysUntilOpen, daysUntilDeadline };
  }

  // pending — derive from dates
  if (!open && !deadline) {
    return { state: "unknown", open, deadline, daysUntilOpen, daysUntilDeadline };
  }

  if (deadline && daysUntilDeadline != null && daysUntilDeadline < 0) {
    return { state: "overdue", open, deadline, daysUntilOpen, daysUntilDeadline };
  }

  if (open && daysUntilOpen != null && daysUntilOpen > 0) {
    return { state: "waiting", open, deadline, daysUntilOpen, daysUntilDeadline };
  }

  // Window is open (open date reached, or unknown open but within deadline)
  if (deadline && daysUntilDeadline != null && daysUntilDeadline <= DUE_SOON_DAYS) {
    return { state: "due_soon", open, deadline, daysUntilOpen, daysUntilDeadline };
  }

  return { state: "open", open, deadline, daysUntilOpen, daysUntilDeadline };
}

// Ordering for the dashboard queue: things needing action first.
const STATE_ORDER: Record<WindowState, number> = {
  overdue: 0,
  due_soon: 1,
  open: 2,
  waiting: 3,
  unknown: 4,
  registered: 5,
  skipped: 6,
};

export function windowSortKey(info: WindowInfo): number {
  const base = STATE_ORDER[info.state] * 100000;
  // Within a state, sort by urgency (soonest deadline first).
  const tie = info.daysUntilDeadline ?? info.daysUntilOpen ?? 9999;
  return base + tie;
}

const LABELS: Record<WindowState, string> = {
  waiting: "Waiting",
  open: "Open now",
  due_soon: "Due soon",
  overdue: "Overdue",
  registered: "Registered",
  skipped: "Skipped",
  unknown: "Needs dates",
};

export function stateLabel(state: WindowState): string {
  return LABELS[state];
}

/** A short human sentence describing what to do / when. */
export function stateHint(info: WindowInfo): string {
  switch (info.state) {
    case "waiting":
      return info.daysUntilOpen === 1
        ? "Opens tomorrow"
        : `Opens in ${info.daysUntilOpen} days`;
    case "open":
      return info.daysUntilDeadline != null
        ? `Register within ${info.daysUntilDeadline} days`
        : "Ready to register";
    case "due_soon":
      if (info.daysUntilDeadline === 0) return "Last day to register";
      return info.daysUntilDeadline === 1
        ? "Due tomorrow"
        : `Due in ${info.daysUntilDeadline} days`;
    case "overdue":
      return info.daysUntilDeadline != null
        ? `Deadline passed ${Math.abs(info.daysUntilDeadline)} days ago`
        : "Deadline passed";
    case "registered":
      return "Registered for e-invoice";
    case "skipped":
      return "Skipped";
    case "unknown":
      return "Add the registration dates";
  }
}

export function formatDate(value: string | null | undefined): string {
  const date = parseDate(value ?? null);
  if (!date) return "—";
  return date.toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
