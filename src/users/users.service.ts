import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async findByEmail(correo: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ correo }).exec();
  }

  async create(data: { nombre: string; correo: string; contraseña: string }): Promise<UserDocument> {
    const newUser = new this.userModel(data);
    return newUser.save();
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).select('-contraseña').exec();
  }
}