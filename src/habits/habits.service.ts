import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Habit, HabitDocument } from './schemas/habit.schema';
import { CreateHabitDto } from './dto/create-habit.dto';
import { UpdateHabitDto } from './dto/update-habit.dto';
import { getHondurasDateString } from '../common/honduras-date.util';
import { HabitRecord, RecordDocument } from '../records/schemas/habit-record.schema';

@Injectable()
export class HabitsService {
  constructor(
    @InjectModel(Habit.name) private habitModel: Model<HabitDocument>,
    @InjectModel(HabitRecord.name) private recordModel: Model<RecordDocument>,
  ) {}

  /**
   * Recorre los hábitos activos del usuario que ya tienen fecha de fin
   * (fechaFin) y, si esa fecha ya pasó respecto a HOY en Honduras, los
   * marca como inactivos automáticamente. Se llama cada vez que se listan
   * o se consulta un hábito, para que la desactivación sea inmediata sin
   * necesidad de un proceso programado (cron) aparte.
   */
  private async deactivateExpiredHabits(userId: string): Promise<void> {
    const today = getHondurasDateString();

    const candidates = await this.habitModel
      .find({
        usuario: new Types.ObjectId(userId),
        activo: true,
        fechaFin: { $exists: true, $ne: null },
      })
      .exec();

    const expiredIds = candidates
      .filter((h) => h.fechaFin && h.fechaFin.toISOString().slice(0, 10) < today)
      .map((h) => h._id);

    if (expiredIds.length > 0) {
      await this.habitModel
        .updateMany({ _id: { $in: expiredIds } }, { activo: false })
        .exec();
    }
  }

  async create(userId: string, dto: CreateHabitDto): Promise<HabitDocument> {
    const newHabit = new this.habitModel({
      ...dto,
      usuario: new Types.ObjectId(userId),
    });
    return newHabit.save();
  }

  async findAllByUser(userId: string): Promise<HabitDocument[]> {
    await this.deactivateExpiredHabits(userId);
    return this.habitModel
      .find({ usuario: new Types.ObjectId(userId) })
      .sort({ prioridad: -1, createdAt: -1 })
      .exec();
  }

  async findOne(userId: string, habitId: string): Promise<HabitDocument> {
    await this.deactivateExpiredHabits(userId);
    const habit = await this.habitModel
      .findOne({ _id: habitId, usuario: new Types.ObjectId(userId) })
      .exec();
    if (!habit) {
      throw new NotFoundException('Hábito no encontrado');
    }
    return habit;
  }

  async update(userId: string, habitId: string, dto: UpdateHabitDto): Promise<HabitDocument> {
    const habit = await this.habitModel
      .findOneAndUpdate(
        { _id: habitId, usuario: new Types.ObjectId(userId) },
        dto,
        { new: true },
      )
      .exec();
    if (!habit) {
      throw new NotFoundException('Hábito no encontrado');
    }
    return habit;
  }

  async remove(userId: string, habitId: string): Promise<void> {
    const result = await this.habitModel
      .deleteOne({ _id: habitId, usuario: new Types.ObjectId(userId) })
      .exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException('Hábito no encontrado');
    }

    await this.recordModel
      .deleteMany({ habito: new Types.ObjectId(habitId), usuario: new Types.ObjectId(userId) })
      .exec();
  }
}