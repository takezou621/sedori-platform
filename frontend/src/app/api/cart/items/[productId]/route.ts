import { NextRequest, NextResponse } from 'next/server';
import { parseHttpError, createValidationError, ErrorCode } from '@/lib/errors';
import { validateCartItem } from '@/lib/validation';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const productId = params.productId;
    const body = await request.json();

    // Validate cart item data
    const validation = validateCartItem({
      productId,
      quantity: body.quantity,
      price: body.price || 0
    });

    if (!validation.isValid) {
      const firstError = validation.errors[0];
      return NextResponse.json(
        {
          success: false,
          error: {
            code: firstError.code,
            message: firstError.userMessage.en,
            messageJa: firstError.userMessage.ja,
            type: firstError.type
          },
          validationErrors: validation.errors
        },
        { status: 400 }
      );
    }

    // Simulate updating cart item
    await new Promise(resolve => setTimeout(resolve, 200));
    
    return NextResponse.json({
      success: true,
      message: 'Cart item updated successfully',
      messageJa: 'カートアイテムを更新しました'
    });

  } catch (error) {
    const appError = parseHttpError(error);
    console.error('Update cart item error:', appError.toJSON());

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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const productId = params.productId;

    if (!productId) {
      const error = createValidationError(ErrorCode.REQUIRED_FIELD, {
        field: 'productId'
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

    // Simulate removing cart item
    await new Promise(resolve => setTimeout(resolve, 200));
    
    return NextResponse.json({
      success: true,
      message: 'Cart item removed successfully',
      messageJa: 'カートアイテムを削除しました'
    });

  } catch (error) {
    const appError = parseHttpError(error);
    console.error('Remove cart item error:', appError.toJSON());

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