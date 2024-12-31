import {
  Controller,
  Post,
  Body,
  BadRequestException,
  Get,
} from '@nestjs/common';
import { CreateAbandonedCartDto } from './dto/create-abandoned-cart.dto';
import { AbandonedCartService } from './abandoned-cart.service';

@Controller('abandoned-cart')
export class AbandonedCartController {
  constructor(private readonly abandonedCartService: AbandonedCartService) {}

  @Post()
  async createAbandonedCart(
    @Body() createAbandonedCartDto: CreateAbandonedCartDto,
  ) {
    if (!createAbandonedCartDto.email) {
      throw new BadRequestException('Email is required');
    }

    // Simple email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(createAbandonedCartDto.email)) {
      throw new BadRequestException('Invalid email format');
    }

    return await this.abandonedCartService.createAbandonedCart(
      createAbandonedCartDto,
    );
  }

  @Get()
  testRoute() {
    return 'Abandoned cart route is working';
  }
}
