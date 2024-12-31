export class CartItem {
  name: string;
  quantity: number;
  price: number;
}

export class CreateAbandonedCartDto {
  customerName: string;
  email: string;
  cartId: string;
  cartItems: CartItem[];
  totalPrice: number;
  abandonmentTimestamp: string;
  returnUrl: string;
  tags?: string[];
}
