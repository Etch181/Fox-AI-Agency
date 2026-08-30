export interface ParsedBookingDateTime {
  date: string;
  time: string;
}

export interface ParsedBookingIdentity {
  name: string;
  phone: string;
}

const ARABIC_MONTHS: Record<string, number> = {
  يناير: 1,
  فبراير: 2,
  مارس: 3,
  أبريل: 4,
  ابريل: 4,
  مايو: 5,
  يونيو: 6,
  يوليو: 7,
  أغسطس: 8,
  اغسطس: 8,
  سبتمبر: 9,
  أكتوبر: 10,
  اكتوبر: 10,
  نوفمبر: 11,
  ديسمبر: 12,
};

const ARABIC_MONTH_PATTERN =
  "يناير|فبراير|مارس|أبريل|ابريل|مايو|يونيو|يوليو|أغسطس|اغسطس|سبتمبر|أكتوبر|اكتوبر|نوفمبر|ديسمبر";

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function formatDate(year: number, month: number, day: number): string {
  const candidate = new Date(year, month - 1, day);
  if (
    candidate.getFullYear() !== year ||
    candidate.getMonth() !== month - 1 ||
    candidate.getDate() !== day
  ) {
    return "";
  }
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function parseDate(text: string, now: Date): string {
  const iso = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (iso) {
    return formatDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  }

  if (/(?:بكره|بكرة|غدا|غداً|tomorrow)/i.test(text)) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return formatDate(
      tomorrow.getFullYear(),
      tomorrow.getMonth() + 1,
      tomorrow.getDate(),
    );
  }

  const arabicDate = text.match(
    new RegExp(`(\\d{1,2})\\s+(${ARABIC_MONTH_PATTERN})`, "i"),
  );
  if (!arabicDate) return "";

  const month = ARABIC_MONTHS[arabicDate[2]];
  if (!month) return "";

  const day = Number(arabicDate[1]);
  let year = now.getFullYear();
  let parsed = formatDate(year, month, day);
  if (!parsed) return "";

  // A yearless clinic date that has already passed means the next occurrence.
  const candidate = new Date(year, month - 1, day, 23, 59, 59, 999);
  if (candidate.getTime() < now.getTime()) {
    year += 1;
    parsed = formatDate(year, month, day);
  }
  return parsed;
}

function formatTime(hour: number, minute: number, period: "AM" | "PM"): string {
  if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return "";
  return `${pad2(hour)}:${pad2(minute)} ${period}`;
}

function parseTime(text: string): string {
  const english = text.match(
    /(?:\bat\s+)?\b(\d{1,2})(?::(\d{2}))?\s*(AM|PM)\b/i,
  );
  if (english) {
    return formatTime(
      Number(english[1]),
      Number(english[2] || 0),
      english[3].toUpperCase() as "AM" | "PM",
    );
  }

  const explicitArabic = text.match(
    /(?:الساعة\s*)?(\d{1,2})(?::(\d{2}))?\s*(صباحاً|صباحا|صباحًا|صباح|ظهراً|ظهرا|ظهرًا|ظهر|مساءً|مساءا|مساء)/i,
  );
  if (explicitArabic) {
    const period = /ظهر|مساء/.test(explicitArabic[3]) ? "PM" : "AM";
    return formatTime(
      Number(explicitArabic[1]),
      Number(explicitArabic[2] || 0),
      period,
    );
  }

  const bareArabic = text.match(/الساعة\s*(\d{1,2})(?::(\d{2}))?(?!\s*\d)/i);
  if (!bareArabic) return "";

  const hour = Number(bareArabic[1]);
  const minute = Number(bareArabic[2] || 0);

  // Deterministic clinic-booking rule for an Arabic time with no period:
  // 1–7 means PM; 8–12 means AM. Explicit Arabic or English periods always win.
  const period: "AM" | "PM" = hour >= 1 && hour <= 7 ? "PM" : "AM";
  return formatTime(hour, minute, period);
}

export function hasBookingDateSignal(text: string): boolean {
  return Boolean(parseDate(String(text || ""), new Date()));
}

export function hasBookingTimeSignal(text: string): boolean {
  return Boolean(parseTime(String(text || "")));
}

export function parseBookingDateTime(
  text: string,
  now: Date = new Date(),
): ParsedBookingDateTime {
  const cleanText = String(text || "").trim();
  return {
    date: parseDate(cleanText, now),
    time: parseTime(cleanText),
  };
}

export function parseBookingIdentity(text: string): ParsedBookingIdentity {
  const identityMessage = String(text || "").trim();
  const phoneMatch = identityMessage.match(/(?:\+?\d[\d\s-]{8,16}\d)/);
  const phone = phoneMatch ? phoneMatch[0].replace(/\D/g, "") : "";

  let name = identityMessage;
  if (phoneMatch) name = name.replace(phoneMatch[0], " ");

  name = name
    .replace(/(?:الاسم|اسمي|اسم\s*صاحب\s*الحجز|name)\s*[:：-]?/gi, " ")
    .replace(
      /(?:و?رقم\s*(?:الموبايل|الموبيل|الهاتف|التليفون)|و?رقمي|phone(?:\s*number)?)\s*[:：-]?/gi,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(?:و|هو|هي)\s+/i, "")
    .trim();

  return { name, phone };
}
