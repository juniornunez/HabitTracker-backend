import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Habit, HabitDocument } from '../habits/schemas/habit.schema';
import { HabitRecord, RecordDocument } from '../records/schemas/habit-record.schema';
import { getHondurasDateString } from '../common/honduras-date.util';
import {
  getHabitStreak,
  countExpectedUnits,
  countCompletedUnits,
  utcMidnight,
} from '../common/habit-stats.util';

function toUtcMidnightFromDateOnly(dateStr: string): Date {
  return new Date(`${dateStr.slice(0, 10)}T00:00:00.000Z`);
}

@Injectable()
export class StatisticsService {
  constructor(
    @InjectModel(Habit.name) private habitModel: Model<HabitDocument>,
    @InjectModel(HabitRecord.name) private recordModel: Model<RecordDocument>,
  ) {}

  private calculatePercentage(
    habitsSubset: HabitDocument[],
    allRecords: RecordDocument[],
    windowStart: Date,
    windowEnd: Date,
  ): number {
    let esperado = 0;
    let completado = 0;

    for (const habit of habitsSubset) {
      const habitStart = utcMidnight(new Date(habit.fechaInicio));
      const habitEnd = habit.fechaFin ? utcMidnight(new Date(habit.fechaFin)) : windowEnd;
      const effectiveStart = habitStart > windowStart ? habitStart : windowStart;
      const effectiveEnd = habitEnd < windowEnd ? habitEnd : windowEnd;
      if (effectiveEnd < effectiveStart) continue;

      const habitRecords = allRecords.filter(
        (r) => r.habito.toString() === habit._id.toString(),
      );
      esperado += countExpectedUnits(habit, effectiveStart, effectiveEnd);
      completado += countCompletedUnits(habit, habitRecords, effectiveStart, effectiveEnd);
    }

    return esperado > 0 ? Math.round((completado / esperado) * 100) : 0;
  }

  async getStatistics(userId: string) {
    const uid = new Types.ObjectId(userId);
    const habits = await this.habitModel.find({ usuario: uid }).exec();
    const allRecords = await this.recordModel
      .find({ usuario: uid, completado: true })
      .exec();

    const totalHabitos = habits.length;
    const habitosActivos = habits.filter((h) => h.activo).length;
    const habitosFinalizados = habits.filter((h) => !h.activo).length;

    const today = toUtcMidnightFromDateOnly(getHondurasDateString());

    const rachasPorHabito = habits.map((habit) => {
      const habitRecords = allRecords.filter(
        (r) => r.habito.toString() === habit._id.toString(),
      );
      const { rachaActual, mejorRacha } = getHabitStreak(habit, habitRecords, today);
      return {
        nombre: habit.nombre,
        categoria: habit.categoria || 'Sin categoría',
        rachaActual,
        mejorRacha,
      };
    });

    const diasConsecutivos = rachasPorHabito.reduce(
      (max, h) => Math.max(max, h.rachaActual),
      0,
    );

    const now = new Date();
    const progresoMensual: { mes: string; total: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${monthDate.getFullYear()}-${monthDate.getMonth()}`;
      const label = monthDate.toLocaleDateString('es-HN', {
        month: 'short',
        year: '2-digit',
      });
      const total = allRecords.filter((r) => {
        const d = new Date(r.fecha);
        return `${d.getUTCFullYear()}-${d.getUTCMonth()}` === monthKey;
      }).length;
      progresoMensual.push({ mes: label, total });
    }

    const windowStart = new Date(today.getTime() - 29 * 86400000);
    const porcentajeGeneral = this.calculatePercentage(habits, allRecords, windowStart, today);

    const categorias = Array.from(
      new Set(habits.map((h) => h.categoria).filter(Boolean)),
    ) as string[];

    const cumplimientoPorCategoria = categorias.map((categoria) => {
      const habitsInCategoria = habits.filter((h) => h.categoria === categoria);
      const porcentaje = this.calculatePercentage(
        habitsInCategoria,
        allRecords,
        windowStart,
        today,
      );
      return { categoria, porcentaje };
    });

    const detallePorHabito = habits.map((habit) => {
      const rachaInfo = rachasPorHabito.find((r) => r.nombre === habit.nombre);
      const porcentaje = this.calculatePercentage([habit], allRecords, windowStart, today);
      return {
        nombre: habit.nombre,
        categoria: habit.categoria || 'Sin categoría',
        porcentajeCumplimiento: porcentaje,
        rachaActual: rachaInfo?.rachaActual || 0,
      };
    });

    return {
      totalHabitos,
      habitosActivos,
      habitosFinalizados,
      diasConsecutivos,
      progresoMensual,
      tendenciaCumplimiento: {
        completado: porcentajeGeneral,
        pendiente: 100 - porcentajeGeneral,
      },
      rachasPorHabito,
      cumplimientoPorCategoria,
      detallePorHabito,
    };
  }
}