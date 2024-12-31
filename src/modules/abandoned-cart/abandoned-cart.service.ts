import { Injectable, Logger } from '@nestjs/common';
import { MailchimpService } from '../../services/mailchimp.service';
import { CreateAbandonedCartDto } from './dto/create-abandoned-cart.dto';

@Injectable()
export class AbandonedCartService {
  private readonly logger = new Logger(AbandonedCartService.name);

  constructor(private mailchimpService: MailchimpService) {}

  async createAbandonedCart(
    createAbandonedCartDto: CreateAbandonedCartDto,
  ): Promise<any> {
    try {
      const {
        email,
        customerName,
        cartId,
        cartItems,
        totalPrice,
        abandonmentTimestamp,
        returnUrl,
        tags = ['Abandoned Cart'],
      } = createAbandonedCartDto;

      const existingTags = await this.mailchimpService.getMemberTags(email);
      this.logger.log(`Existing tags for ${email}:`, existingTags);

      const formattedCartItems = cartItems
        .map((item) => `${item.name} (${item.quantity}) - $${item.price}`)
        .join(', ');

      const mergeFields = {
        FNAME: customerName.split(' ')[0],
        LNAME: customerName.split(' ').slice(1).join(' '),
        CARTID: cartId,
        CARTITEMS: formattedCartItems,
        TOTALPRICE: totalPrice.toString(),
        ABNDNTIME: abandonmentTimestamp,
        RETURNURL: returnUrl,
      };

      const updatedTags = [...new Set([...existingTags, ...tags])];

      const response = await this.mailchimpService.updateSubscriber(
        email,
        mergeFields,
        updatedTags,
      );

      this.logger.log(
        `Successfully updated abandoned cart for ${email} in Mailchimp`,
      );
      this.logger.log(
        'Merge fields sent:',
        JSON.stringify(mergeFields, null, 2),
      );
      this.logger.log('Tags sent:', updatedTags);

      const finalTags = await this.mailchimpService.getMemberTags(email);
      this.logger.log(`Final tags for ${email}:`, finalTags);

      return response;
    } catch (error) {
      this.logger.error(
        `Failed to update abandoned cart in Mailchimp: ${error.message}`,
      );
      throw error;
    }
  }
}
