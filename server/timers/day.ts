const istOffsetMinutes = 330;

export function todayRangeInIst(now = new Date()) {
  const offsetMs = istOffsetMinutes * 60 * 1000;
  const localNow = new Date(now.getTime() + offsetMs);
  const year = localNow.getUTCFullYear();
  const month = localNow.getUTCMonth();
  const date = localNow.getUTCDate();
  const startUtcMs = Date.UTC(year, month, date) - offsetMs;

  return {
    startIso: new Date(startUtcMs).toISOString(),
    endIso: new Date(startUtcMs + 24 * 60 * 60 * 1000).toISOString(),
  };
}
