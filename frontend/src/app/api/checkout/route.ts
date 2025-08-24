import { NextRequest, NextResponse } from 'next/server';
import { 
  parseHttpError, 
  createValidationError, 
  createApiError,
  ErrorCode 
} from '@/lib/errors';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    if (!body.cartItems || !Array.isArray(body.cartItems) || body.cartItems.length === 0) {
      const error = createApiError(ErrorCode.CART_EMPTY, 400, {
        message: 'Cart is empty or invalid'
      });
      
      return NextResponse.json(
        {
          success: false,
          error: {
            code: error.code,
            message: error.userMessage.en,
            messageJa: error.userMessage.ja,
            type: error.type
          }
        },
        { status: 400 }
      );
    }

    // Validate cart items
    for (const item of body.cartItems) {
      if (!item.productId || !item.quantity || item.quantity <= 0) {
        const error = createValidationError(ErrorCode.INVALID_NUMBER, {
          field: 'cartItems',
          message: 'Invalid cart item data'
        });
        
        return NextResponse.json(
          {
            success: false,
            error: {
              code: error.code,
              message: error.userMessage.en,
              messageJa: error.userMessage.ja,
              type: error.type
            }
          },
          { status: 400 }
        );
      }

      // Check stock availability (mock)
      if (item.stock !== undefined && item.quantity > item.stock) {
        const error = createApiError(ErrorCode.PRODUCT_OUT_OF_STOCK, 400, {
          productId: item.productId,
          requested: item.quantity,
          available: item.stock
        });
        
        return NextResponse.json(
          {
            success: false,
            error: {
              code: error.code,
              message: error.userMessage.en,
              messageJa: error.userMessage.ja,
              type: error.type
            }
          },
          { status: 400 }
        );
      }
    }

    // Simulate checkout process
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Calculate totals
    const subtotal = body.cartItems.reduce((sum: number, item: any) => 
      sum + (item.price * item.quantity), 0
    );
    
    const tax = Math.floor(subtotal * 0.1); // 10% tax
    const total = subtotal + tax;

    // Generate mock order ID
    const orderId = `ORDER-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    return NextResponse.json({
      success: true,
      orderId,
      orderNumber: orderId.replace('ORDER-', ''),
      subtotal,
      tax,
      total,
      estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      message: 'Order placed successfully',
      messageJa: '注文が正常に完了しました',
      items: body.cartItems.map((item: any) => ({
        productId: item.productId,
        title: item.title,
        quantity: item.quantity,
        price: item.price,
        total: item.price * item.quantity
      }))
    });

  } catch (error) {
    const appError = parseHttpError(error);
    console.error('Checkout error:', appError.toJSON());

    return NextResponse.json(
      {
        success: false,
        error: {
          code: appError.code,
          message: appError.userMessage.en,
          messageJa: appError.userMessage.ja,
          type: appError.type
        }
      },
      { status: appError.statusCode }
    );
  }
}