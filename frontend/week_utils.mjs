export const WEEKDAY_VALUES = [1, 2, 3, 4, 5, 6, 7];

export function formatDateIso(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getWeekStartMonday(dateInput = new Date()) {
  const date = new Date(dateInput);
  date.setHours(0, 0, 0, 0);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date;
}

export function getWeekStartForToday() {
  return getWeekStartMonday(new Date());
}

export function getDateByWeekday(weekStartInput, weekday) {
  const weekStart = new Date(weekStartInput);
  weekStart.setHours(0, 0, 0, 0);
  const target = new Date(weekStart);
  target.setDate(weekStart.getDate() + (Number(weekday) - 1));
  return formatDateIso(target);
}

export function getWeekRangeText(weekStartInput) {
  const weekStart = new Date(weekStartInput);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  return `${formatDateIso(weekStart)} ~ ${formatDateIso(weekEnd)}`;
}

export function getWeekdayHeaderText(weekStartInput, weekday, weekdayLabel) {
  const sessionDate = getDateByWeekday(weekStartInput, weekday);
  const [, month, day] = sessionDate.split('-');
  return `${weekdayLabel} ${month}/${day}`;
}

export function getResetWeekStartForToday(now = new Date()) {
  return getWeekStartMonday(now);
}
