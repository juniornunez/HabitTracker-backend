import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  nombre: string;

  @Prop({ required: true, unique: true })
  correo: string;

  @Prop({ required: true })
  contraseña: string;
}

export const UserSchema = SchemaFactory.createForClass(User);