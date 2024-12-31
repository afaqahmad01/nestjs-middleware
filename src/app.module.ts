import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AbandonedCartModule } from './modules/abandoned-cart/abandoned-cart.module';
import { UserModule } from './modules/user/user.module';

@Module({
  imports: [ConfigModule.forRoot(), UserModule, AbandonedCartModule],
})
export class AppModule {}
