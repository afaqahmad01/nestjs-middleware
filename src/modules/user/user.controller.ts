import {
  Controller,
  Post,
  Body,
  Get,
  Put,
  Param,
  BadRequestException,
} from '@nestjs/common';
import { UserService } from './user.service';
import { MailchimpService } from '../../services/mailchimp.service';

@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly mailchimpService: MailchimpService,
  ) {}

  @Post()
  async registerUser(@Body() userData: { name: string; email: string }) {
    if (!userData.name || !userData.email) {
      throw new BadRequestException('Name and email are required');
    }

    // Simple email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
      throw new BadRequestException('Invalid email format');
    }

    return await this.userService.registerUser(userData.name, userData.email);
  }

  @Put(':email')
  async updateUser(
    @Param('email') email: string,
    @Body() userData: { name?: string; email?: string },
  ) {
    if (!email) {
      throw new BadRequestException('Email is required');
    }

    if (userData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userData.email)) {
        throw new BadRequestException('Invalid email format');
      }
    }

    return await this.userService.updateUser(email, userData);
  }

  @Get()
  async getUsersFromMailchimp() {
    return await this.userService.getUsersFromMailchimp();
  }

  @Get('verify-mailchimp')
  async verifyMailchimpConnection() {
    await this.mailchimpService.verifyConnection();
    return { message: 'Mailchimp connection verified' };
  }
}
