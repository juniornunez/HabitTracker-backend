import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { HabitRecord, RecordDocument } from './schemas/habit-record.schema';
import { Habit, HabitDocument } from '../habits/schemas/habit.schema';
import { getHondurasDateString } from '../common/honduras-date.util';
import {
  getHabitStreak,
  getMondayOfWeek,
  countExpectedUnits,
  countCompletedUnits,
  utcMidnight,
} from '../common/habit-stats.util';

function toUtcMidnightFromDateOnly(dateStr: string): Date {
  return new Date(`${dateStr.slice(0, 10)}T00:00:00.000Z`);
}

function todayUtcMidnight(): Date {
  return toUtcMidnightFromDateOnly(getHondurasDateString());
}

@Injectable()
export class RecordsService {
  constructor(
    @InjectModel(HabitRecord.name) private recordModel: Model<RecordDocument>,
    @InjectModel(Habit.name) private habitModel: Model<HabitDocument>,
  ) {}

  private async getHabitOrFail(userId: string, habitId: string): Promise<HabitDocument> {
    const habit = await this.habitModel
      .findOne({ _id: habitId, usuario: new Types.ObjectId(userId) })
      .exec();
    if (!habit) {
      throw new NotFoundException('Hábito no encontrado');
    }
    return habit;
  }

  async markComplete(userId: string, habitId: string, fecha?: string) {
    await this.getHabitOrFail(userId, habitId);

    const targetDate = fecha ? toUtcMidnightFromDateOnly(fecha) : todayUtcMidnight();

    return this.recordModel
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
  }

  async unmarkComplete(userId: string, habitId: string, fecha?: string) {
    const habit = await this.getHabitOrFail(userId, habitId);

    if (habit.frecuencia === 'semanal') {
      // Para hábitos semanales no sabemos qué día exacto se marcó (pudo
      // haber sido cualquier día de la semana), así que al "desmarcar"
      // borramos cualquier registro dentro de la semana actual completa
      // (lunes 00:00 a domingo 23:59, hora de Honduras).
      const monday = getMondayOfWeek(todayUtcMidnight());
      const sunday = new Date(monday.getTime() + 6 * 86400000);
      await this.recordModel
        .deleteMany({
          habito: new Types.ObjectId(habitId),
          usuario: new Types.ObjectId(userId),
          fecha: { $gte: monday, $lte: sunday },
        })
        .exec();
      return { deleted: true };
    }

    const targetDate = fecha ? toUtcMidnightFromDateOnly(fecha) : todayUtcMidnight();
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
    await this.getHabitOrFail(userId, habitId);
    return this.recordModel
      .find({ habito: new Types.ObjectId(habitId), usuario: new Types.ObjectId(userId) })
      .sort({ fecha: -1 })
      .exec();
  }

  async getStreak(userId: string, habitId: string) {
    const habit = await this.getHabitOrFail(userId, habitId);
    const records = await this.recordModel
      .find({
        habito: new Types.ObjectId(habitId),
        usuario: new Types.ObjectId(userId),
        completado: true,
      })
      .exec();
    return getHabitStreak(habit, records, todayUtcMidnight());
  }

  async getCompletionRate(userId: string, habitId: string, days = 7): Promise<number> {
    const habit = await this.getHabitOrFail(userId, habitId);
    const today = todayUtcMidnight();
    const windowStart = new Date(today.getTime() - (days - 1) * 86400000);
    const habitStart = utcMidnight(new Date(habit.fechaInicio));
    const effectiveStart = habitStart > windowStart ? habitStart : windowStart;

    if (effectiveStart > today) return 0;

    const records = await this.recordModel
      .find({
        habito: new Types.ObjectId(habitId),
        usuario: new Types.ObjectId(userId),
        completado: true,
      })
      .exec();

    const esperado = countExpectedUnits(habit, effectiveStart, today);
    const completado = countCompletedUnits(habit, records, effectiveStart, today);
    return esperado > 0 ? Math.round((completado / esperado) * 100) : 0;
  }
}