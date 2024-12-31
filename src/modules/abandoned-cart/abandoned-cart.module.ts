import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AbandonedCartController } from './abandoned-cart.controller';
import { AbandonedCartService } from './abandoned-cart.service';
import { MailchimpService } from 'src/services/mailchimp.service';

@Module({
  imports: [ConfigModule],
  controllers: [AbandonedCartController],
  providers: [AbandonedCartService, MailchimpService],
})
export class AbandonedCartModule {}
