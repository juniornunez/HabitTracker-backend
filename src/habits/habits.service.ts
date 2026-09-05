import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Habit, HabitDocument } from './schemas/habit.schema';
import { CreateHabitDto } from './dto/create-habit.dto';
import { UpdateHabitDto } from './dto/update-habit.dto';

@Injectable()
export class HabitsService {
  constructor(
    @InjectModel(Habit.name) private habitModel: Model<HabitDocument>,
  ) {}

  async create(userId: string, dto: CreateHabitDto): Promise<HabitDocument> {
    const newHabit = new this.habitModel({
      ...dto,
      usuario: new Types.ObjectId(userId),
    });
    return newHabit.save();
  }

  async findAllByUser(userId: string): Promise<HabitDocument[]> {
    return this.habitModel
      .find({ usuario: new Types.ObjectId(userId) })
      .sort({ prioridad: -1, createdAt: -1 })
      .exec();
  }

  async findOne(userId: string, habitId: string): Promise<HabitDocument> {
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
  }
}