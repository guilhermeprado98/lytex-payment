import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  async create(name: string, email: string, password: string): Promise<UserDocument> {
    const hash = await bcrypt.hash(password, 10);
    const created = new this.userModel({ name, email, password: hash });
    return created.save();
  }

  async findByEmail(email: string, withPassword = false): Promise<UserDocument | null> {
    const q = this.userModel.findOne({ email: email.toLowerCase().trim() });
    if (withPassword) {
      return q.select('+password').exec();
    }
    return q.exec();
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  /** Lista usuários (dados públicos) para painel interno — em produção restrinja por perfil admin. */
  async listDirectory() {
    return this.userModel
      .find()
      .select('name email createdAt')
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }
}
