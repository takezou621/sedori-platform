import { test, expect } from '@playwright/test';

test.describe('🛒 Cart & Order Flow - Browser E2E Tests', () => {
  const API_BASE = 'http://localhost:3000/v1';
  
  let userToken: string;
  let adminToken: string;
  let testUserId: string;
  let testProductId: string;
  let testCategoryId: string;
  let testCartId: string;
  let testOrderId: string;

  const testUser = {
    email: 'cart.user@example.com',
    password: 'CartUser123!',
    name: 'Cart Test User'
  };

  const adminUser = {
    email: 'cart.admin@example.com',
    password: 'CartAdmin123!',
    name: 'Cart Admin User'
  };

  const testCategory = {
    name: 'Cart Test Category',
    description: 'Category for cart testing',
    slug: 'cart-test-category'
  };

  const testProduct = {
    name: 'Cart Test Product',
    description: 'Product for cart and order testing',
    sku: 'CART-TEST-001',
    brand: 'CartBrand',
    wholesalePrice: 800.00,
    retailPrice: 1200.00,
    currency: 'JPY',
    condition: 'new',
    status: 'active',
    supplier: 'Cart Test Supplier',
    stockQuantity: 100,
    minOrderQuantity: 1,
    maxOrderQuantity: 5
  };

  test.beforeAll('Set up test data', async ({ request }) => {
    // Register and login admin
    await request.post(`${API_BASE}/auth/register`, {
      data: { ...adminUser, role: 'admin' }
    });
    
    const adminLogin = await request.post(`${API_BASE}/auth/login`, {
      data: { email: adminUser.email, password: adminUser.password }
    });
    const adminResult = await adminLogin.json();
    adminToken = adminResult.access_token;

    // Register and login user
    const userRegister = await request.post(`${API_BASE}/auth/register`, {
      data: testUser
    });
    const userRegisterResult = await userRegister.json();
    testUserId = userRegisterResult.user.id;
    
    const userLogin = await request.post(`${API_BASE}/auth/login`, {
      data: { email: testUser.email, password: testUser.password }
    });
    const userResult = await userLogin.json();
    userToken = userResult.access_token;

    // Create test category
    const categoryResponse = await request.post(`${API_BASE}/categories`, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
      data: testCategory
    });
    const category = await categoryResponse.json();
    testCategoryId = category.id;

    // Create test product
    const productResponse = await request.post(`${API_BASE}/products`, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
      data: { ...testProduct, categoryId: testCategoryId }
    });
    const product = await productResponse.json();
    testProductId = product.id;
  });

  test('🎯 Cart Creation and Management', async ({ request }) => {
    // Add item to cart (creates cart automatically)
    const addToCartResponse = await request.post(`${API_BASE}/carts/add`, {
      headers: { 'Authorization': `Bearer ${userToken}` },
      data: {
        productId: testProductId,
        quantity: 2
      }
    });

    expect(addToCartResponse.status()).toBe(201);
    const cartResult = await addToCartResponse.json();
    testCartId = cartResult.id;
    expect(cartResult.items).toHaveLength(1);
    expect(cartResult.items[0].quantity).toBe(2);
    expect(cartResult.items[0].product.id).toBe(testProductId);
  });

  test('🎯 Cart Item Updates', async ({ request }) => {
    // Update item quantity
    const updateResponse = await request.patch(`${API_BASE}/carts/items/${testProductId}`, {
      headers: { 'Authorization': `Bearer ${userToken}` },
      data: { quantity: 3 }
    });

    expect(updateResponse.status()).toBe(200);
    const updatedCart = await updateResponse.json();
    expect(updatedCart.items[0].quantity).toBe(3);

    // Add second item
    const secondProductResponse = await request.post(`${API_BASE}/products`, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
      data: {
        ...testProduct,
        name: 'Second Cart Product',
        sku: 'CART-TEST-002',
        categoryId: testCategoryId
      }
    });
    const secondProduct = await secondProductResponse.json();

    const addSecondItemResponse = await request.post(`${API_BASE}/carts/add`, {
      headers: { 'Authorization': `Bearer ${userToken}` },
      data: {
        productId: secondProduct.id,
        quantity: 1
      }
    });

    expect(addSecondItemResponse.status()).toBe(201);
    const cartWithTwoItems = await addSecondItemResponse.json();
    expect(cartWithTwoItems.items).toHaveLength(2);
  });

  test('🎯 Cart Validation and Limits', async ({ request }) => {
    // Test exceeding maximum order quantity
    const exceedLimitResponse = await request.patch(`${API_BASE}/carts/items/${testProductId}`, {
      headers: { 'Authorization': `Bearer ${userToken}` },
      data: { quantity: 10 } // Max is 5
    });

    expect(exceedLimitResponse.status()).toBe(400);

    // Test zero quantity (should remove item)
    const removeItemResponse = await request.patch(`${API_BASE}/carts/items/${testProductId}`, {
      headers: { 'Authorization': `Bearer ${userToken}` },
      data: { quantity: 0 }
    });

    expect(removeItemResponse.status()).toBe(200);
    const cartAfterRemoval = await removeItemResponse.json();
    expect(cartAfterRemoval.items).toHaveLength(1); // Only second item remains
  });

  test('🎯 Cart Total Calculations', async ({ request }) => {
    // Add items back for calculation test
    await request.post(`${API_BASE}/carts/add`, {
      headers: { 'Authorization': `Bearer ${userToken}` },
      data: {
        productId: testProductId,
        quantity: 2
      }
    });

    // Get cart with totals
    const cartResponse = await request.get(`${API_BASE}/carts/my-cart`, {
      headers: { 'Authorization': `Bearer ${userToken}` }
    });

    expect(cartResponse.status()).toBe(200);
    const cart = await cartResponse.json();
    
    // Verify total calculation
    const expectedSubtotal = (testProduct.retailPrice * 2) + (testProduct.retailPrice * 1); // 2400 + 1200 = 3600
    expect(cart.subtotal).toBe(expectedSubtotal);
    expect(cart.total).toBeGreaterThanOrEqual(cart.subtotal);
  });

  test('🎯 Concurrent Cart Modifications', async ({ request }) => {
    // Test concurrent cart updates
    const promises = [
      request.patch(`${API_BASE}/carts/items/${testProductId}`, {
        headers: { 'Authorization': `Bearer ${userToken}` },
        data: { quantity: 3 }
      }),
      request.patch(`${API_BASE}/carts/items/${testProductId}`, {
        headers: { 'Authorization': `Bearer ${userToken}` },
        data: { quantity: 2 }
      })
    ];

    const results = await Promise.all(promises);
    
    // At least one should succeed
    expect(results.some(r => r.status() === 200)).toBe(true);
    
    // Final state should be consistent
    const finalCartResponse = await request.get(`${API_BASE}/carts/my-cart`, {
      headers: { 'Authorization': `Bearer ${userToken}` }
    });
    
    const finalCart = await finalCartResponse.json();
    expect(finalCart.items.find(i => i.product.id === testProductId)?.quantity).toBeGreaterThan(0);
  });

  test('🎯 Order Creation from Cart', async ({ request }) => {
    // Create order from cart
    const createOrderResponse = await request.post(`${API_BASE}/orders`, {
      headers: { 'Authorization': `Bearer ${userToken}` },
      data: {
        shippingAddress: {
          fullName: 'Test User',
          streetAddress: '123 Test Street',
          city: 'Tokyo',
          state: 'Tokyo',
          postalCode: '100-0001',
          country: 'Japan',
          phoneNumber: '090-1234-5678'
        },
        paymentMethod: 'credit_card',
        paymentDetails: {
          cardNumber: '4111111111111111',
          expiryMonth: 12,
          expiryYear: 2025,
          cvv: '123'
        }
      }
    });

    expect(createOrderResponse.status()).toBe(201);
    const order = await createOrderResponse.json();
    testOrderId = order.id;
    
    expect(order.userId).toBe(testUserId);
    expect(order.status).toBe('pending');
    expect(order.items).toHaveLength(2);
    expect(order.totalAmount).toBeGreaterThan(0);
  });

  test('🎯 Order Status Management', async ({ request }) => {
    // Admin updates order status
    const updateStatusResponse = await request.patch(`${API_BASE}/orders/${testOrderId}/status`, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
      data: { status: 'confirmed' }
    });

    expect(updateStatusResponse.status()).toBe(200);
    const updatedOrder = await updateStatusResponse.json();
    expect(updatedOrder.status).toBe('confirmed');

    // User cannot update order status
    const userUpdateResponse = await request.patch(`${API_BASE}/orders/${testOrderId}/status`, {
      headers: { 'Authorization': `Bearer ${userToken}` },
      data: { status: 'shipped' }
    });
    expect(userUpdateResponse.status()).toBe(403);
  });

  test('🎯 Order History and Retrieval', async ({ request }) => {
    // User can view their orders
    const userOrdersResponse = await request.get(`${API_BASE}/orders/my-orders`, {
      headers: { 'Authorization': `Bearer ${userToken}` }
    });

    expect(userOrdersResponse.status()).toBe(200);
    const userOrders = await userOrdersResponse.json();
    expect(userOrders).toHaveLength(1);
    expect(userOrders[0].id).toBe(testOrderId);

    // Admin can view all orders
    const allOrdersResponse = await request.get(`${API_BASE}/orders`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    expect(allOrdersResponse.status()).toBe(200);
    const allOrders = await allOrdersResponse.json();
    expect(allOrders.length).toBeGreaterThanOrEqual(1);

    // Get specific order details
    const orderDetailsResponse = await request.get(`${API_BASE}/orders/${testOrderId}`, {
      headers: { 'Authorization': `Bearer ${userToken}` }
    });

    expect(orderDetailsResponse.status()).toBe(200);
    const orderDetails = await orderDetailsResponse.json();
    expect(orderDetails.id).toBe(testOrderId);
    expect(orderDetails.items).toBeDefined();
    expect(orderDetails.shippingAddress).toBeDefined();
  });

  test('🎯 Order Processing Workflow', async ({ request }) => {
    // Process order through complete workflow
    const statusUpdates = ['processing', 'shipped', 'delivered'];
    
    for (const status of statusUpdates) {
      const updateResponse = await request.patch(`${API_BASE}/orders/${testOrderId}/status`, {
        headers: { 'Authorization': `Bearer ${adminToken}` },
        data: { status }
      });

      expect(updateResponse.status()).toBe(200);
      const updatedOrder = await updateResponse.json();
      expect(updatedOrder.status).toBe(status);
      
      // Add small delay to ensure timestamps are different
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  });

  test('🎯 Order Cancellation', async ({ request }) => {
    // Create another order for cancellation test
    await request.post(`${API_BASE}/carts/add`, {
      headers: { 'Authorization': `Bearer ${userToken}` },
      data: {
        productId: testProductId,
        quantity: 1
      }
    });

    const cancelOrderResponse = await request.post(`${API_BASE}/orders`, {
      headers: { 'Authorization': `Bearer ${userToken}` },
      data: {
        shippingAddress: {
          fullName: 'Test User',
          streetAddress: '123 Test Street',
          city: 'Tokyo',
          state: 'Tokyo',
          postalCode: '100-0001',
          country: 'Japan',
          phoneNumber: '090-1234-5678'
        },
        paymentMethod: 'credit_card'
      }
    });

    const orderToCancel = await cancelOrderResponse.json();

    // Cancel the order
    const cancelResponse = await request.patch(`${API_BASE}/orders/${orderToCancel.id}/status`, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
      data: { status: 'cancelled' }
    });

    expect(cancelResponse.status()).toBe(200);
    const cancelledOrder = await cancelResponse.json();
    expect(cancelledOrder.status).toBe('cancelled');
  });

  test('🎯 Stock Management During Orders', async ({ request }) => {
    // Check initial stock
    const initialProductResponse = await request.get(`${API_BASE}/products/${testProductId}`);
    const initialProduct = await initialProductResponse.json();
    const initialStock = initialProduct.stockQuantity;

    // Create order that should reduce stock
    await request.post(`${API_BASE}/carts/add`, {
      headers: { 'Authorization': `Bearer ${userToken}` },
      data: {
        productId: testProductId,
        quantity: 5
      }
    });

    const stockOrderResponse = await request.post(`${API_BASE}/orders`, {
      headers: { 'Authorization': `Bearer ${userToken}` },
      data: {
        shippingAddress: {
          fullName: 'Test User',
          streetAddress: '123 Test Street',
          city: 'Tokyo',
          state: 'Tokyo',
          postalCode: '100-0001',
          country: 'Japan',
          phoneNumber: '090-1234-5678'
        },
        paymentMethod: 'credit_card'
      }
    });

    expect(stockOrderResponse.status()).toBe(201);

    // Check stock after order
    const finalProductResponse = await request.get(`${API_BASE}/products/${testProductId}`);
    const finalProduct = await finalProductResponse.json();
    expect(finalProduct.stockQuantity).toBeLessThan(initialStock);
  });

  test('🎯 Cart Cleanup After Order', async ({ request }) => {
    // Verify cart is cleared after order creation
    const cartAfterOrderResponse = await request.get(`${API_BASE}/carts/my-cart`, {
      headers: { 'Authorization': `Bearer ${userToken}` }
    });

    expect(cartAfterOrderResponse.status()).toBe(200);
    const emptyCart = await cartAfterOrderResponse.json();
    expect(emptyCart.items).toHaveLength(0);
    expect(emptyCart.subtotal).toBe(0);
    expect(emptyCart.total).toBe(0);
  });

  test.afterAll('Clean up test data', async ({ request }) => {
    // Clean up created products, categories, and users
    try {
      await request.delete(`${API_BASE}/products/${testProductId}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      
      await request.delete(`${API_BASE}/categories/${testCategoryId}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });

      await request.delete(`${API_BASE}/users/cleanup-test-users`);
    } catch (error) {
      // Ignore cleanup errors
    }
  });
});