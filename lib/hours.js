// Opening hours: the weekly table, upcoming exceptions and the schema.org versions of both.
import { pick } from "./i18n.js";
import { DAYS } from "./validate.js";

const SCHEMA_DAYS = { monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday", thursday: "Thursday", friday: "Friday", saturday: "Saturday", sunday: "Sunday" };

const capitalize = (text) => text.charAt(0).toLocaleUpperCase() + text.slice(1);
const utcDate = (date) => new Date(`${date}T00:00:00Z`);
const normalize = (hours) => (hours.closed === true ? { closed: true } : { closed: false, opens: hours.opens, closes: hours.closes });
const sameHours = (a, b) => a.closed === b.closed && a.opens === b.opens && a.closes === b.closes;

// "YYYY-MM-DD" for today in the given time zone.
export function todayIn(timeZone, now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function addDays(date, days) {
  const result = utcDate(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}

// Exceptions that have not ended and start within the window. Past ones disappear by themselves.
export function upcomingExceptions(exceptions, today, windowDays) {
  const last = addDays(today, windowDays);
  return exceptions
    .filter((exception) => (exception.to || exception.from) >= today && exception.from <= last)
    .sort((a, b) => a.from.localeCompare(b.from));
}

export function formatTime(time, locale) {
  const [hour, minute] = time.split(":").map(Number);
  return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "UTC" }).format(new Date(Date.UTC(2000, 0, 1, hour, minute)));
}

const hoursText = (hours, locale, closedLabel) => (hours.closed ? closedLabel : `${formatTime(hours.opens, locale)}–${formatTime(hours.closes, locale)}`);

// Consecutive days with the same hours share a row: "Tirsdag–torsdag 12:00–19:00".
export function weeklyRows(openingHours, { days, closed }, locale) {
  const groups = [];
  for (const day of DAYS) {
    const hours = normalize(openingHours[day]);
    const previous = groups.at(-1);
    if (previous && sameHours(previous.hours, hours)) previous.days.push(day);
    else groups.push({ days: [day], hours });
  }
  return groups.map(({ days: group, hours }) => ({
    label: capitalize(group.length > 1 ? `${days[group[0]]}–${days[group.at(-1)]}` : days[group[0]]),
    text: hoursText(hours, locale, closed),
  }));
}

export function exceptionRows(exceptions, chain, { closed }, locale) {
  return exceptions.map((exception) => {
    const to = exception.to || exception.from;
    const single = to === exception.from;
    const format = new Intl.DateTimeFormat(locale, single ? { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" } : { day: "numeric", month: "long", timeZone: "UTC" });
    return {
      from: exception.from,
      to,
      label: capitalize(single ? format.format(utcDate(exception.from)) : format.formatRange(utcDate(exception.from), utcDate(to))),
      text: hoursText(normalize(exception), locale, closed),
      note: pick(exception.note, chain) ?? null,
    };
  });
}

// Days with the same hours are combined; closed days are left out.
export function openingHoursSpecification(openingHours) {
  const byHours = new Map();
  for (const day of DAYS) {
    const hours = normalize(openingHours[day]);
    if (hours.closed) continue;
    const key = `${hours.opens}-${hours.closes}`;
    if (!byHours.has(key)) byHours.set(key, { "@type": "OpeningHoursSpecification", dayOfWeek: [], opens: hours.opens, closes: hours.closes });
    byHours.get(key).dayOfWeek.push(SCHEMA_DAYS[day]);
  }
  return [...byHours.values()];
}

// Closed all day is written as opens = closes = "00:00", as Google documents it.
export function specialOpeningHoursSpecification(exceptions) {
  return exceptions.map((exception) => ({
    "@type": "OpeningHoursSpecification",
    validFrom: exception.from,
    validThrough: exception.to || exception.from,
    opens: exception.closed ? "00:00" : exception.opens,
    closes: exception.closed ? "00:00" : exception.closes,
  }));
}
