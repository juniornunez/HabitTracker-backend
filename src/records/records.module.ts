import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { RecordsController } from './records.controller';
import { RecordsService } from './records.service';
import { HabitRecord, HabitRecordSchema } from './schemas/habit-record.schema';
import { Habit, HabitSchema } from '../habits/schemas/habit.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: HabitRecord.name, schema: HabitRecordSchema },
      { name: Habit.name, schema: HabitSchema },
    ]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [RecordsController],
  providers: [RecordsService],
  exports: [RecordsService],
})
export class RecordsModule {}