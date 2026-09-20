import { HabitDocument } from '../habits/schemas/habit.schema';
import { RecordDocument } from '../records/schemas/habit-record.schema';

export const DIAS_SEMANA = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab'] as const;

const DAY_MS = 86400000;
const WEEK_MS = DAY_MS * 7;

/** Pone en 00:00:00 UTC una fecha que ya representa un día calendario. */
export function utcMidnight(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/** Lunes (00:00 UTC) de la semana a la que pertenece `date`. */
export function getMondayOfWeek(date: Date): Date {
  const midnight = utcMidnight(date);
  const weekday = midnight.getUTCDay(); // 0=domingo..6=sábado
  const diff = weekday === 0 ? -6 : 1 - weekday;
  midnight.setUTCDate(midnight.getUTCDate() + diff);
  return midnight;
}

export interface StreakResult {
  rachaActual: number;
  mejorRacha: number;
}

function calculateConsecutiveStreak(
  unitTimes: number[],
  unitMs: number,
  currentUnitTime: number,
): StreakResult {
  if (unitTimes.length === 0) return { rachaActual: 0, mejorRacha: 0 };

  const unique = Array.from(new Set(unitTimes)).sort((a, b) => a - b);
  let mejorRacha = 1;
  let rachaTemp = 1;

  for (let i = 1; i < unique.length; i++) {
    if (unique[i] - unique[i - 1] === unitMs) {
      rachaTemp += 1;
    } else {
      mejorRacha = Math.max(mejorRacha, rachaTemp);
      rachaTemp = 1;
    }
  }
  mejorRacha = Math.max(mejorRacha, rachaTemp);

  const previousUnitTime = currentUnitTime - unitMs;
  const lastUnit = unique[unique.length - 1];

  let rachaActual = 0;
  if (lastUnit === currentUnitTime || lastUnit === previousUnitTime) {
    rachaActual = 1;
    for (let i = unique.length - 1; i > 0; i--) {
      if (unique[i] - unique[i - 1] === unitMs) {
        rachaActual += 1;
      } else {
        break;
      }
    }
  }

  return { rachaActual, mejorRacha };
}

/**
 * Racha de un hábito según su frecuencia:
 * - diario y personalizada: días consecutivos con al menos un registro
 * - semanal: semanas consecutivas (lunes a domingo) con al menos un registro
 */
export function getHabitStreak(
  habit: HabitDocument,
  completedRecords: RecordDocument[],
  todayUtcMidnight: Date,
): StreakResult {
  if (habit.frecuencia === 'semanal') {
    const mondayTimes = completedRecords.map((r) =>
      getMondayOfWeek(new Date(r.fecha)).getTime(),
    );
    const currentMonday = getMondayOfWeek(todayUtcMidnight).getTime();
    return calculateConsecutiveStreak(mondayTimes, WEEK_MS, currentMonday);
  }

  const dayTimes = completedRecords.map((r) => utcMidnight(new Date(r.fecha)).getTime());
  return calculateConsecutiveStreak(dayTimes, DAY_MS, todayUtcMidnight.getTime());
}

/** Cuántas unidades (días, semanas, o días configurados) se esperan que
 * el hábito se cumpla dentro de [start, end] (inclusive), según su frecuencia. */
export function countExpectedUnits(habit: HabitDocument, start: Date, end: Date): number {
  if (start > end) return 0;

  if (habit.frecuencia === 'semanal') {
    let count = 0;
    let cursor = getMondayOfWeek(start);
    while (cursor <= end) {
      count += 1;
      cursor = new Date(cursor.getTime() + WEEK_MS);
    }
    return count;
  }

  if (habit.frecuencia === 'personalizada') {
    const dias = habit.diasPersonalizados || [];
    let count = 0;
    const cursor = new Date(start);
    while (cursor <= end) {
      const code = DIAS_SEMANA[cursor.getUTCDay()];
      if (dias.includes(code)) count += 1;
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return count;
  }

  return Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1;
}

/** Cuántas unidades se completaron realmente dentro de [start, end]. */
export function countCompletedUnits(
  habit: HabitDocument,
  records: RecordDocument[],
  start: Date,
  end: Date,
): number {
  const inRange = records.filter((r) => {
    const d = new Date(r.fecha);
    return d >= start && d <= end;
  });

  if (habit.frecuencia === 'semanal') {
    const weeks = new Set(inRange.map((r) => getMondayOfWeek(new Date(r.fecha)).getTime()));
    return weeks.size;
  }

  const days = new Set(inRange.map((r) => utcMidnight(new Date(r.fecha)).getTime()));
  return days.size;
}