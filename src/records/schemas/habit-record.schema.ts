import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RecordDocument = HabitRecord & Document;

@Schema({ timestamps: true })
export class HabitRecord {
  @Prop({ type: Types.ObjectId, ref: 'Habit', required: true })
  habito: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  usuario: Types.ObjectId;

  // Guardamos la fecha normalizada a medianoche (00:00:00) para que
  // cada día tenga como máximo un registro por hábito.
  @Prop({ required: true })
  fecha: Date;

  @Prop({ default: true })
  completado: boolean;
}

export const HabitRecordSchema = SchemaFactory.createForClass(HabitRecord);

// Índice único: un hábito no puede tener dos registros para el mismo día.
HabitRecordSchema.index({ habito: 1, fecha: 1 }, { unique: true });