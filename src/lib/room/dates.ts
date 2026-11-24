export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(iso: string, delta: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + delta);
  return isoDate(d);
}

export function mondayOf(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return isoDate(d);
}

export function weekdaysFromMonday(mondayIso: string): string[] {
  return [0, 1, 2, 3, 4].map((offset) => addDays(mondayIso, offset));
}

export function monthGrid(year: number, month: number): string[] {
  const first = new Date(year, month, 1, 12, 0, 0);
  const start = mondayOf(isoDate(first));
  const out: string[] = [];
  for (let w = 0; w < 5; w++) {
    for (let d = 0; d < 5; d++) {
      out.push(addDays(start, w * 7 + d));
    }
  }
  return out;
}

export function shortDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
