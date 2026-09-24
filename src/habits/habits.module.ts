import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { HabitsController } from './habits.controller';
import { HabitsService } from './habits.service';
import { Habit, HabitSchema } from './schemas/habit.schema';
import { HabitRecord, HabitRecordSchema } from '../records/schemas/habit-record.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Habit.name, schema: HabitSchema },
      { name: HabitRecord.name, schema: HabitRecordSchema },
    ]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [HabitsController],
  providers: [HabitsService],
  exports: [HabitsService],
})
export class HabitsModule {}