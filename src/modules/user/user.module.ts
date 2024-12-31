import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { MailchimpService } from '../../services/mailchimp.service';

@Module({
  imports: [ConfigModule],
  controllers: [UserController],
  providers: [UserService, MailchimpService],
})
export class UserModule {}
