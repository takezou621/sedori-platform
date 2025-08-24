/**
 * Comprehensive input validation utilities
 */

import { 
  validateEmail, 
  validatePassword, 
  validateRequired, 
  validatePositiveNumber, 
  validateProfitCalculation,
  createValidationError,
  ErrorCode,
  AppError
} from './errors';

export interface ValidationResult {
  isValid: boolean;
  errors: AppError[];
  warnings: string[];
}

export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword?: string;
}

export interface ProductFormData {
  title: string;
  description: string;
  price: number;
  cost: number;
  category: string;
  stock: number;
  imageUrl?: string;
}

export interface CartItem {
  productId: string;
  quantity: number;
  price: number;
}

// Login form validation
export function validateLoginForm(data: Partial<LoginFormData>): ValidationResult {
  const errors: AppError[] = [];
  const warnings: string[] = [];

  try {
    // Validate email
    if (data.email !== undefined) {
      validateRequired(data.email, 'email');
      validateEmail(data.email);
    }
  } catch (error) {
    if (error instanceof AppError) {
      errors.push(error);
    }
  }

  try {
    // Validate password
    if (data.password !== undefined) {
      validateRequired(data.password, 'password');
      validatePassword(data.password);
    }
  } catch (error) {
    if (error instanceof AppError) {
      errors.push(error);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// Register form validation
export function validateRegisterForm(data: Partial<RegisterFormData>): ValidationResult {
  const errors: AppError[] = [];
  const warnings: string[] = [];

  try {
    // Validate name
    if (data.name !== undefined) {
      validateRequired(data.name, 'name');
      if (data.name && (data.name.length < 2 || data.name.length > 50)) {
        throw createValidationError(ErrorCode.INVALID_NUMBER, { 
          field: 'name', 
          message: 'Name must be between 2 and 50 characters' 
        });
      }
    }
  } catch (error) {
    if (error instanceof AppError) {
      errors.push(error);
    }
  }

  try {
    // Validate email
    if (data.email !== undefined) {
      validateRequired(data.email, 'email');
      validateEmail(data.email);
    }
  } catch (error) {
    if (error instanceof AppError) {
      errors.push(error);
    }
  }

  try {
    // Validate password
    if (data.password !== undefined) {
      validateRequired(data.password, 'password');
      validatePassword(data.password);
    }
  } catch (error) {
    if (error instanceof AppError) {
      errors.push(error);
    }
  }

  try {
    // Validate password confirmation
    if (data.confirmPassword !== undefined && data.password !== undefined) {
      if (data.password !== data.confirmPassword) {
        throw createValidationError(ErrorCode.INVALID_PASSWORD, {
          message: 'Passwords do not match'
        });
      }
    }
  } catch (error) {
    if (error instanceof AppError) {
      errors.push(error);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// Product form validation
export function validateProductForm(data: Partial<ProductFormData>): ValidationResult {
  const errors: AppError[] = [];
  const warnings: string[] = [];

  try {
    // Validate title
    if (data.title !== undefined) {
      validateRequired(data.title, 'title');
      if (data.title && (data.title.length < 3 || data.title.length > 200)) {
        throw createValidationError(ErrorCode.INVALID_NUMBER, {
          field: 'title',
          message: 'Title must be between 3 and 200 characters'
        });
      }
    }
  } catch (error) {
    if (error instanceof AppError) {
      errors.push(error);
    }
  }

  try {
    // Validate description
    if (data.description !== undefined) {
      validateRequired(data.description, 'description');
      if (data.description && data.description.length > 1000) {
        warnings.push('Description is very long. Consider making it more concise.');
      }
    }
  } catch (error) {
    if (error instanceof AppError) {
      errors.push(error);
    }
  }

  try {
    // Validate category
    if (data.category !== undefined) {
      validateRequired(data.category, 'category');
    }
  } catch (error) {
    if (error instanceof AppError) {
      errors.push(error);
    }
  }

  try {
    // Validate stock
    if (data.stock !== undefined) {
      validatePositiveNumber(data.stock, 'stock');
      if (data.stock && !Number.isInteger(data.stock)) {
        throw createValidationError(ErrorCode.INVALID_NUMBER, {
          field: 'stock',
          message: 'Stock must be a whole number'
        });
      }
    }
  } catch (error) {
    if (error instanceof AppError) {
      errors.push(error);
    }
  }

  try {
    // Validate pricing
    if (data.cost !== undefined && data.price !== undefined) {
      validateProfitCalculation(data.cost, data.price);
      
      // Calculate profit margin and add warnings
      const profit = data.price - data.cost;
      const margin = (profit / data.price) * 100;
      
      if (margin < 10) {
        warnings.push('Low profit margin. Consider adjusting pricing for better profitability.');
      } else if (margin > 80) {
        warnings.push('Very high profit margin. Ensure pricing is competitive.');
      }
    }
  } catch (error) {
    if (error instanceof AppError) {
      errors.push(error);
    }
  }

  try {
    // Validate image URL if provided
    if (data.imageUrl !== undefined && data.imageUrl) {
      const urlPattern = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i;
      if (!urlPattern.test(data.imageUrl)) {
        throw createValidationError(ErrorCode.INVALID_NUMBER, {
          field: 'imageUrl',
          message: 'Please provide a valid image URL (jpg, png, gif, webp)'
        });
      }
    }
  } catch (error) {
    if (error instanceof AppError) {
      errors.push(error);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// Cart validation
export function validateCartItem(item: Partial<CartItem>): ValidationResult {
  const errors: AppError[] = [];
  const warnings: string[] = [];

  try {
    if (item.productId !== undefined) {
      validateRequired(item.productId, 'productId');
    }
  } catch (error) {
    if (error instanceof AppError) {
      errors.push(error);
    }
  }

  try {
    if (item.quantity !== undefined) {
      validatePositiveNumber(item.quantity, 'quantity');
      if (item.quantity && !Number.isInteger(item.quantity)) {
        throw createValidationError(ErrorCode.INVALID_NUMBER, {
          field: 'quantity',
          message: 'Quantity must be a whole number'
        });
      }
      if (item.quantity && item.quantity > 99) {
        warnings.push('Large quantity selected. Please verify this is correct.');
      }
    }
  } catch (error) {
    if (error instanceof AppError) {
      errors.push(error);
    }
  }

  try {
    if (item.price !== undefined) {
      validatePositiveNumber(item.price, 'price');
    }
  } catch (error) {
    if (error instanceof AppError) {
      errors.push(error);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// Real-time validation helpers
export function validateField(
  fieldName: string,
  value: any,
  formType: 'login' | 'register' | 'product' | 'cart'
): ValidationResult {
  const errors: AppError[] = [];

  try {
    switch (formType) {
      case 'login':
        if (fieldName === 'email') {
          validateEmail(value);
        } else if (fieldName === 'password') {
          validatePassword(value);
        }
        break;

      case 'register':
        if (fieldName === 'email') {
          validateEmail(value);
        } else if (fieldName === 'password') {
          validatePassword(value);
        } else if (fieldName === 'name') {
          validateRequired(value, fieldName);
        }
        break;

      case 'product':
        if (fieldName === 'cost' || fieldName === 'price') {
          validatePositiveNumber(parseFloat(value) || 0, fieldName);
        } else if (fieldName === 'stock') {
          validatePositiveNumber(parseInt(value) || 0, fieldName);
        } else {
          validateRequired(value, fieldName);
        }
        break;

      case 'cart':
        if (fieldName === 'quantity') {
          validatePositiveNumber(parseInt(value) || 0, fieldName);
        }
        break;
    }
  } catch (error) {
    if (error instanceof AppError) {
      errors.push(error);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings: []
  };
}

// Sanitization utilities
export function sanitizeString(input: string): string {
  return input?.trim().replace(/[<>]/g, '') || '';
}

export function sanitizeNumber(input: string | number): number {
  if (typeof input === 'number') {
    return isFinite(input) ? input : 0;
  }
  const parsed = parseFloat(input);
  return isFinite(parsed) ? parsed : 0;
}

export function sanitizeInteger(input: string | number): number {
  if (typeof input === 'number') {
    return Number.isInteger(input) ? input : Math.floor(input);
  }
  const parsed = parseInt(input);
  return isFinite(parsed) ? parsed : 0;
}