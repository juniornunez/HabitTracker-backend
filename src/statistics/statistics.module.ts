import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { StatisticsController } from './statistics.controller';
import { StatisticsService } from './statistics.service';
import { Habit, HabitSchema } from '../habits/schemas/habit.schema';
import { HabitRecord, HabitRecordSchema } from '../records/schemas/habit-record.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Habit.name, schema: HabitSchema },
      { name: HabitRecord.name, schema: HabitRecordSchema },
    ]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [StatisticsController],
  providers: [StatisticsService],
})
export class StatisticsModule {}