import { Injectable } from '@nestjs/common';
import { User } from './user.entity';
import { MailchimpService } from '../../services/mailchimp.service';

@Injectable()
export class UserService {
  private users: User[] = [];
  private idCounter = 1;

  constructor(private mailchimpService: MailchimpService) {}

  async registerUser(name: string, email: string): Promise<User> {
    const newUser: User = {
      id: this.idCounter++,
      name,
      email,
      signupDate: new Date(),
    };
    this.users.push(newUser);

    try {
      await this.mailchimpService.addToList(email, name, ['New-customer']);
    } catch (error) {
      if (error.response) {
        throw new Error(`Mailchimp API error: ${error.response.text}`);
      }
      throw new Error(`Mailchimp integration failed: ${error.message}`);
    }

    return newUser;
  }

  async updateUser(
    email: string,
    userData: { name?: string; email?: string },
  ): Promise<User> {
    const user = this.users.find((u) => u.email === email);
    if (!user) {
      throw new Error('User not found');
    }

    if (userData.name) {
      user.name = userData.name;
    }
    if (userData.email) {
      user.email = userData.email;
    }

    try {
      const mailchimpUser = await this.mailchimpService.getSubscriber(email);
      if (mailchimpUser) {
        await this.mailchimpService.updateSubscriber(
          email,
          {
            FNAME: user.name.split(' ')[0],
            LNAME: user.name.split(' ').slice(1).join(' '),
            EMAIL: user.email,
          },
          ['New-Customer'],
        );
      } else {
        await this.mailchimpService.addToList(user.email, user.name, [
          'New-Customer',
        ]);
      }
    } catch (error) {
      if (error.response) {
        throw new Error(`Mailchimp API error: ${error.response.text}`);
      }
      throw new Error(`Mailchimp integration failed: ${error.message}`);
    }

    return user;
  }

  getAllUsers(): User[] {
    return this.users;
  }

  async getUsersFromMailchimp(): Promise<any[]> {
    try {
      return await this.mailchimpService.getListMembers();
    } catch (error) {
      if (error.response) {
        throw new Error(`Mailchimp API error: ${error.response.text}`);
      }
      throw new Error(`Failed to get users from Mailchimp: ${error.message}`);
    }
  }
}
