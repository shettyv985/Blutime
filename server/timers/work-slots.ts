export type WorkSlot = {
  endedAt: string;
  startedAt: string;
};

type NormalizedWorkSlot = WorkSlot & {
  endedAtDate: Date;
  seconds: number;
  startedAtDate: Date;
};

export function serializeWorkSlots(slots: WorkSlot[]) {
  return JSON.stringify(slots);
}

export function parseStoredWorkSlots(value: string | null, fallback: WorkSlot) {
  if (!value) return [fallback];

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [fallback];

    const slots = parsed
      .map((slot) => {
        if (!slot || typeof slot !== "object") return null;
        const record = slot as Record<string, unknown>;
        if (typeof record.startedAt !== "string" || typeof record.endedAt !== "string") return null;

        const startedAt = new Date(record.startedAt);
        const endedAt = new Date(record.endedAt);
        if (Number.isNaN(startedAt.getTime()) || Number.isNaN(endedAt.getTime())) return null;
        if (endedAt.getTime() <= startedAt.getTime()) return null;

        return {
          startedAt: startedAt.toISOString(),
          endedAt: endedAt.toISOString(),
        };
      })
      .filter((slot): slot is WorkSlot => Boolean(slot));

    return slots.length > 0 ? slots : [fallback];
  } catch {
    return [fallback];
  }
}

export function normalizeWorkSlots(input: unknown) {
  if (!Array.isArray(input) || input.length === 0 || input.length > 12) {
    return { error: "Add between 1 and 12 time slots." } as const;
  }

  const slots: NormalizedWorkSlot[] = [];

  for (const item of input) {
    if (!item || typeof item !== "object") {
      return { error: "Every time slot needs a valid start and end time." } as const;
    }

    const record = item as Record<string, unknown>;
    if (typeof record.startedAt !== "string" || typeof record.endedAt !== "string") {
      return { error: "Every time slot needs a valid start and end time." } as const;
    }

    const startedAtDate = new Date(record.startedAt);
    const endedAtDate = new Date(record.endedAt);

    if (Number.isNaN(startedAtDate.getTime()) || Number.isNaN(endedAtDate.getTime())) {
      return { error: "Every time slot needs a valid start and end time." } as const;
    }

    const seconds = Math.floor((endedAtDate.getTime() - startedAtDate.getTime()) / 1000);
    if (seconds < 1) {
      return { error: "Each time slot must end after it starts." } as const;
    }

    slots.push({
      startedAt: startedAtDate.toISOString(),
      endedAt: endedAtDate.toISOString(),
      startedAtDate,
      endedAtDate,
      seconds,
    });
  }

  slots.sort((a, b) => a.startedAtDate.getTime() - b.startedAtDate.getTime());

  for (let index = 1; index < slots.length; index += 1) {
    if (slots[index].startedAtDate.getTime() < slots[index - 1].endedAtDate.getTime()) {
      return { error: "Time slots cannot overlap." } as const;
    }
  }

  const firstSlot = slots[0];
  const lastSlot = slots[slots.length - 1];
  const rangeSeconds = Math.floor((lastSlot.endedAtDate.getTime() - firstSlot.startedAtDate.getTime()) / 1000);
  const totalSeconds = slots.reduce((sum, slot) => sum + slot.seconds, 0);

  if (totalSeconds < 1 || totalSeconds > 24 * 60 * 60 || rangeSeconds > 24 * 60 * 60) {
    return { error: "Time slots must stay within a 24-hour work range." } as const;
  }

  return {
    endedAt: lastSlot.endedAt,
    startedAt: firstSlot.startedAt,
    totalSeconds,
    workSlots: slots.map(({ endedAt, startedAt }) => ({ endedAt, startedAt })),
  } as const;
}
