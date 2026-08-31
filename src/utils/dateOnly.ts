function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatLocalDateKey(value: Date): string {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    return "";
  }

  return [
    value.getFullYear(),
    pad2(value.getMonth() + 1),
    pad2(value.getDate()),
  ].join("-");
}

export function formatDateKeyInTimeZone(
  value: Date,
  timeZone = "Africa/Cairo",
): string {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    return "";
  }

  const parts = new Intl.DateTimeFormat("en", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const byType = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${byType.year}-${byType.month}-${byType.day}`;
}

export function isBusinessDateTimeInPast(
  date: string,
  time: string,
  now = new Date(),
  timeZone = "Africa/Cairo",
): boolean {
  if (!isValidDateOnlyKey(date)) return true;

  const timeMatch = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(
    String(time || "").trim(),
  );
  if (!timeMatch) return true;

  let requestedHour = Number(timeMatch[1]);
  const requestedMinute = Number(timeMatch[2]);
  if (
    requestedHour < 1 ||
    requestedHour > 12 ||
    requestedMinute < 0 ||
    requestedMinute > 59
  ) {
    return true;
  }
  const period = timeMatch[3].toUpperCase();
  requestedHour %= 12;
  if (period === "PM") requestedHour += 12;

  const today = formatDateKeyInTimeZone(now, timeZone);
  if (date < today) return true;
  if (date > today) return false;

  const parts = new Intl.DateTimeFormat("en", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const byType = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  const currentMinutes = Number(byType.hour) * 60 + Number(byType.minute);
  const requestedMinutes = requestedHour * 60 + requestedMinute;
  return requestedMinutes <= currentMinutes;
}

export function isValidDateOnlyKey(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(
    String(value || ""),
  );
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (month < 1 || month > 12 || day < 1) return false;

  const daysInMonth = new Date(year, month, 0).getDate();
  return day <= daysInMonth;
}
