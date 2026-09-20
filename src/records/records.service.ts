import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { HabitRecord, RecordDocument } from './schemas/habit-record.schema';
import { Habit, HabitDocument } from '../habits/schemas/habit.schema';

function normalizeToMidnight(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

@Injectable()
export class RecordsService {
  constructor(
    @InjectModel(HabitRecord.name) private recordModel: Model<RecordDocument>,
    @InjectModel(Habit.name) private habitModel: Model<HabitDocument>,
  ) {}

  private async assertHabitBelongsToUser(userId: string, habitId: string) {
    const habit = await this.habitModel
      .findOne({ _id: habitId, usuario: new Types.ObjectId(userId) })
      .exec();
    if (!habit) {
      throw new NotFoundException('Hábito no encontrado');
    }
    return habit;
  }

  async markComplete(userId: string, habitId: string, fecha?: string) {
    await this.assertHabitBelongsToUser(userId, habitId);

    const targetDate = normalizeToMidnight(fecha ? new Date(fecha) : new Date());

    // Upsert: si ya existe el registro para ese día, lo deja en completado=true;
    // si no existe, lo crea. Así marcar dos veces el mismo día no genera duplicados.
    const record = await this.recordModel
      .findOneAndUpdate(
        {
          habito: new Types.ObjectId(habitId),
          usuario: new Types.ObjectId(userId),
          fecha: targetDate,
        },
        { completado: true },
        { new: true, upsert: true },
      )
      .exec();

    return record;
  }

  async unmarkComplete(userId: string, habitId: string, fecha?: string) {
    await this.assertHabitBelongsToUser(userId, habitId);

    const targetDate = normalizeToMidnight(fecha ? new Date(fecha) : new Date());

    await this.recordModel
      .deleteOne({
        habito: new Types.ObjectId(habitId),
        usuario: new Types.ObjectId(userId),
        fecha: targetDate,
      })
      .exec();

    return { deleted: true };
  }

  async getHistory(userId: string, habitId: string) {
    await this.assertHabitBelongsToUser(userId, habitId);

    return this.recordModel
      .find({
        habito: new Types.ObjectId(habitId),
        usuario: new Types.ObjectId(userId),
      })
      .sort({ fecha: -1 })
      .exec();
  }

  /**
   * Calcula la racha actual y la mejor racha de un hábito, contando
   * días consecutivos con completado=true. Pensado principalmente
   * para hábitos de frecuencia "diario"; para otras frecuencias el
   * número sigue siendo válido pero representa días consecutivos
   * reales, no "unidades" de la frecuencia.
   */
  async getStreak(userId: string, habitId: string) {
    const records = await this.recordModel
      .find({
        habito: new Types.ObjectId(habitId),
        usuario: new Types.ObjectId(userId),
        completado: true,
      })
      .sort({ fecha: 1 })
      .exec();

    if (records.length === 0) {
      return { rachaActual: 0, mejorRacha: 0 };
    }

    const dates = records.map((r) => normalizeToMidnight(r.fecha).getTime());
    const uniqueDates = Array.from(new Set(dates)).sort((a, b) => a - b);

    let mejorRacha = 1;
    let rachaTemp = 1;

    for (let i = 1; i < uniqueDates.length; i++) {
      const diffDays = (uniqueDates[i] - uniqueDates[i - 1]) / 86400000;
      if (diffDays === 1) {
        rachaTemp += 1;
      } else {
        mejorRacha = Math.max(mejorRacha, rachaTemp);
        rachaTemp = 1;
      }
    }
    mejorRacha = Math.max(mejorRacha, rachaTemp);

    // Racha actual: contamos hacia atrás desde hoy o ayer (si hoy
    // todavía no se marcó) mientras haya días consecutivos.
    const today = normalizeToMidnight(new Date()).getTime();
    const yesterday = today - 86400000;
    const lastDate = uniqueDates[uniqueDates.length - 1];

    let rachaActual = 0;
    if (lastDate === today || lastDate === yesterday) {
      rachaActual = 1;
      for (let i = uniqueDates.length - 1; i > 0; i--) {
        const diffDays = (uniqueDates[i] - uniqueDates[i - 1]) / 86400000;
        if (diffDays === 1) {
          rachaActual += 1;
        } else {
          break;
        }
      }
    }

    return { rachaActual, mejorRacha };
  }

  /**
   * Porcentaje de cumplimiento de un hábito en los últimos N días
   * (o desde su fecha de inicio, lo que sea más reciente).
   */
  async getCompletionRate(
    userId: string,
    habitId: string,
    days = 7,
  ): Promise<number> {
    const habit = await this.assertHabitBelongsToUser(userId, habitId);

    const today = normalizeToMidnight(new Date());
    const windowStart = new Date(today.getTime() - (days - 1) * 86400000);
    const habitStart = normalizeToMidnight(new Date(habit.fechaInicio));
    const effectiveStart = habitStart > windowStart ? habitStart : windowStart;

    const totalDays =
      Math.round((today.getTime() - effectiveStart.getTime()) / 86400000) + 1;
    if (totalDays <= 0) return 0;

    const completedCount = await this.recordModel
      .countDocuments({
        habito: new Types.ObjectId(habitId),
        usuario: new Types.ObjectId(userId),
        completado: true,
        fecha: { $gte: effectiveStart, $lte: today },
      })
      .exec();

    return Math.round((completedCount / totalDays) * 100);
  }
}