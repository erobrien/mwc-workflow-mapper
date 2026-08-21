// Populated at build time via Vite `define` in vite.config.ts.
// Falls back to a runtime stamp only if the define was missing (dev without git).
declare const __BUILD_TIME_ISO__: string;
declare const __BUILD_COMMIT__: string;

const RAW_ISO: string =
  typeof __BUILD_TIME_ISO__ !== "undefined" && __BUILD_TIME_ISO__
    ? __BUILD_TIME_ISO__
    : new Date().toISOString();

const RAW_COMMIT: string =
  typeof __BUILD_COMMIT__ !== "undefined" && __BUILD_COMMIT__
    ? __BUILD_COMMIT__
    : "";

export const BUILD_TIME_ISO = RAW_ISO;
export const BUILD_COMMIT = RAW_COMMIT;

const TZ = "America/Los_Angeles";

// e.g. "Aug 21, 2026, 6:10 AM PT"
function formatPT(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  }).formatToParts(d);

  const grab = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const month = grab("month");
  const day = grab("day");
  const year = grab("year");
  const hour = grab("hour");
  const minute = grab("minute");
  const dayPeriod = grab("dayPeriod");
  let tz = grab("timeZoneName");
  // Normalize PDT/PST to a single "PT" label per spec.
  if (tz === "PDT" || tz === "PST") tz = "PT";
  return `${month} ${day}, ${year}, ${hour}:${minute} ${dayPeriod} ${tz}`;
}

export const BUILD_TIME_LABEL = formatPT(RAW_ISO);
