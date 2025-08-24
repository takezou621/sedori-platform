import { NextRequest, NextResponse } from 'next/server';
import { parseHttpError } from '@/lib/errors';

export async function GET(request: NextRequest) {
  try {
    // Mock cart data for development
    const mockCartData = {
      items: [
        {
          id: 'cart-item-1',
          productId: 'product-1',
          title: 'Sample Product 1',
          price: 2980,
          cost: 1500,
          quantity: 2,
          imageUrl: null,
          stock: 10
        },
        {
          id: 'cart-item-2', 
          productId: 'product-2',
          title: 'Sample Product 2',
          price: 4500,
          cost: 2800,
          quantity: 1,
          imageUrl: null,
          stock: 5
        }
      ],
      total: 10460,
      itemCount: 3
    };

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    return NextResponse.json({
      success: true,
      data: mockCartData
    });

  } catch (error) {
    const appError = parseHttpError(error);
    console.error('Cart API error:', appError.toJSON());

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Simulate adding item to cart
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return NextResponse.json({
      success: true,
      message: 'Item added to cart successfully',
      messageJa: 'カートに商品を追加しました'
    });

  } catch (error) {
    const appError = parseHttpError(error);
    console.error('Add to cart error:', appError.toJSON());

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