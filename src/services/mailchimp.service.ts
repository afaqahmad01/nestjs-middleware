import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mailchimp from '@mailchimp/mailchimp_marketing';
import { createHash } from 'crypto';

@Injectable()
export class MailchimpService implements OnModuleInit {
  private readonly logger = new Logger(MailchimpService.name);
  private listId: string;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('MAILCHIMP_API_KEY');
    const server = this.configService.get<string>('MAILCHIMP_SERVER_PREFIX');
    this.listId = this.configService.get<string>('MAILCHIMP_AUDIENCE_ID');

    if (!apiKey || !server || !this.listId) {
      this.logger.error('Missing Mailchimp configuration');
      throw new Error('Mailchimp configuration is missing');
    }

    mailchimp.setConfig({
      apiKey,
      server,
    });
  }

  async onModuleInit() {
    await this.verifyConnection();
    await this.ensureMergeFieldsExist();
  }

  async verifyConnection(): Promise<void> {
    try {
      const response = await mailchimp.ping.get();
      this.logger.log('Mailchimp connection verified:', response);
    } catch (error) {
      this.logger.error('Failed to connect to Mailchimp:', error.message);
      if (error.response) {
        this.logger.error('Mailchimp API response:', error.response.text);
      }
      throw error;
    }
  }

  async ensureMergeFieldsExist(): Promise<void> {
    const requiredFields = [
      { tag: 'CARTID', name: 'Cart ID', type: 'text' },
      { tag: 'CARTITEMS', name: 'Cart Items', type: 'text' },
      { tag: 'TOTALPRICE', name: 'Total Price', type: 'number' },
      { tag: 'ABNDNTIME', name: 'Abandonment Time', type: 'text' },
      { tag: 'RETURNURL', name: 'Return URL', type: 'text' },
    ];

    try {
      const existingFields = await mailchimp.lists.getListMergeFields(
        this.listId,
      );
      const existingTags = existingFields.merge_fields.map(
        (field) => field.tag,
      );

      for (const field of requiredFields) {
        if (!existingTags.includes(field.tag)) {
          try {
            await mailchimp.lists.addListMergeField(this.listId, field);
            this.logger.log(`Added merge field ${field.tag}`);
          } catch (error) {
            if (
              error.status === 400 &&
              error.title === 'Invalid Resource' &&
              error.detail.includes('already exists')
            ) {
              this.logger.log(`Merge field ${field.tag} already exists`);
            } else {
              this.logger.error(
                `Failed to add merge field ${field.tag}: ${error.message}`,
              );
              if (error.response) {
                this.logger.error(
                  'Mailchimp API response:',
                  error.response.text,
                );
              }
            }
          }
        } else {
          this.logger.log(`Merge field ${field.tag} already exists`);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to get list merge fields: ${error.message}`);
      if (error.response) {
        this.logger.error('Mailchimp API response:', error.response.text);
      }
    }
  }

  async addToList(email: string, name: string, tags: string[]): Promise<any> {
    try {
      this.logger.log(`Adding user to Mailchimp list: ${email}`);

      const response = await mailchimp.lists.addListMember(this.listId, {
        email_address: email,
        status: 'subscribed',
        merge_fields: {
          FNAME: name.split(' ')[0],
          LNAME: name.split(' ').slice(1).join(' '),
        },
        tags: tags,
      });

      this.logger.log(`Successfully added ${email} to Mailchimp list`);
      return response;
    } catch (error) {
      this.logger.error(
        `Failed to add subscriber to Mailchimp: ${error.message}`,
      );
      if (error.response) {
        this.logger.error('Mailchimp API response:', error.response.text);
      }
      throw error;
    }
  }

  async updateSubscriber(
    email: string,
    mergeFields: any,
    tags: string[],
  ): Promise<any> {
    try {
      this.logger.log(`Updating subscriber in Mailchimp: ${email}`);

      const subscriberHash = this.getSubscriberHash(email);

      const response = await mailchimp.lists.updateListMember(
        this.listId,
        subscriberHash,
        {
          merge_fields: mergeFields,
          tags: tags,
        },
      );

      this.logger.log(`Successfully updated ${email} in Mailchimp`);
      this.logger.log('Tags added:', tags);
      return response;
    } catch (error) {
      this.logger.error(
        `Failed to update subscriber in Mailchimp: ${error.message}`,
      );
      if (error.response) {
        this.logger.error('Mailchimp API response:', error.response.text);
      }
      throw error;
    }
  }

  async getSubscriber(email: string): Promise<any> {
    try {
      this.logger.log(`Getting subscriber from Mailchimp: ${email}`);

      const subscriberHash = this.getSubscriberHash(email);

      const response = await mailchimp.lists.getListMember(
        this.listId,
        subscriberHash,
      );

      this.logger.log(`Successfully retrieved ${email} from Mailchimp`);
      return response;
    } catch (error) {
      if (error.status === 404) {
        this.logger.log(`Subscriber ${email} not found in Mailchimp`);
        return null;
      }
      this.logger.error(
        `Failed to get subscriber from Mailchimp: ${error.message}`,
      );
      if (error.response) {
        this.logger.error('Mailchimp API response:', error.response.text);
      }
      throw error;
    }
  }
  async getListMembers(): Promise<any[]> {
    try {
      this.logger.log('Getting all members from Mailchimp list');

      const response = await mailchimp.lists.getListMembersInfo(this.listId);

      this.logger.log('Successfully retrieved members from Mailchimp list');
      return response.members;
    } catch (error) {
      this.logger.error(
        `Failed to get members from Mailchimp list: ${error.message}`,
      );
      if (error.response) {
        this.logger.error('Mailchimp API response:', error.response.text);
      }
      throw error;
    }
  }

  async getMemberTags(email: string): Promise<string[]> {
    try {
      const subscriberHash = this.getSubscriberHash(email);
      const response = await mailchimp.lists.getListMemberTags(
        this.listId,
        subscriberHash,
      );
      this.logger.error('Mailchimp API response:', response);
      return response.tags.map((tag) => tag.name);
    } catch (error) {
      this.logger.error(`Failed to get member tags: ${error.message}`);
      throw error;
    }
  }

  private getSubscriberHash(email: string): string {
    return createHash('md5').update(email.toLowerCase()).digest('hex');
  }
}
