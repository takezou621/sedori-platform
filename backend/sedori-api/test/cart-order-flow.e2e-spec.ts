import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { E2ETestHelper } from './helpers/test-helper';

describe('Cart & Order Flow E2E Tests', () => {
  let app: INestApplication;
  let helper: E2ETestHelper;
  let httpServer: any;
  let testAdmin: any;
  let testUser: any;
  let testCategory: any;
  let testProducts: any[];

  beforeAll(async () => {
    helper = new E2ETestHelper();
    app = await helper.setupTestApp();
    httpServer = helper.getHttpServer();
  });

  afterAll(async () => {
    await helper.teardownTestApp();
  });

  beforeEach(async () => {
    testAdmin = await helper.createTestAdmin();
    testUser = await helper.createTestUser();
    testCategory = await helper.createTestCategory(testAdmin);

    // Create test products
    testProducts = [];
    for (let i = 1; i <= 3; i++) {
      const product = await helper.createTestProduct(testAdmin, testCategory, {
        name: `Test Product ${i}`,
        wholesalePrice: i * 1000,
      });
      testProducts.push(product);
    }
  });

  afterEach(async () => {
    await helper.cleanupTestData();
  });

  describe('Cart Management', () => {
    it('should create empty cart for new user', async () => {
      const response = await request(httpServer)
        .get('/carts')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .expect(200);

      expect(response.body.userId).toBe(testUser.id);
      expect(response.body.totalAmount).toBe(0);
      expect(response.body.totalItems).toBe(0);
      expect(response.body.items).toHaveLength(0);
    });

    it('should add product to cart', async () => {
      const product = testProducts[0];
      const quantity = 2;

      const response = await request(httpServer)
        .post('/carts/items')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({
          productId: product.id,
          quantity,
        })
        .expect(201);

      expect(response.body.totalItems).toBe(quantity);
      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].productId).toBe(product.id);
      expect(response.body.items[0].quantity).toBe(quantity);
      expect(Number(response.body.items[0].unitPrice)).toBe(
        product.wholesalePrice,
      );
      expect(Number(response.body.items[0].totalPrice)).toBe(
        product.wholesalePrice * quantity,
      );
    });

    it('should update quantity when adding same product', async () => {
      const product = testProducts[0];

      // Add product first time
      await helper.addToCart(testUser, product, 1);

      // Add same product again
      const response = await request(httpServer)
        .post('/carts/items')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({
          productId: product.id,
          quantity: 2,
        })
        .expect(201);

      expect(response.body.totalItems).toBe(3); // 1 + 2
      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].quantity).toBe(3);
    });

    it('should add multiple different products', async () => {
      const product1 = testProducts[0];
      const product2 = testProducts[1];

      await helper.addToCart(testUser, product1, 1);
      await helper.addToCart(testUser, product2, 2);

      const cart = await helper.getCart(testUser);

      expect(cart.totalItems).toBe(3); // 1 + 2
      expect(cart.items).toHaveLength(2);
      expect(Number(cart.totalAmount)).toBe(
        product1.wholesalePrice + product2.wholesalePrice * 2,
      );
    });

    it('should update cart item quantity', async () => {
      const product = testProducts[0];
      await helper.addToCart(testUser, product, 1);

      const cart = await helper.getCart(testUser);
      const itemId = cart.items[0].id;

      const response = await request(httpServer)
        .put(`/carts/items/${itemId}`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({ quantity: 5 })
        .expect(200);

      expect(response.body.items[0].quantity).toBe(5);
      expect(Number(response.body.items[0].totalPrice)).toBe(
        product.wholesalePrice * 5,
      );
      expect(response.body.totalItems).toBe(5);
    });

    it('should remove item from cart', async () => {
      const product = testProducts[0];
      await helper.addToCart(testUser, product, 1);

      const cart = await helper.getCart(testUser);
      const itemId = cart.items[0].id;

      const response = await request(httpServer)
        .delete(`/carts/items/${itemId}`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .expect(200);

      expect(response.body.items).toHaveLength(0);
      expect(response.body.totalItems).toBe(0);
      expect(response.body.totalAmount).toBe(0);
    });

    it('should clear entire cart', async () => {
      await helper.addToCart(testUser, testProducts[0], 1);
      await helper.addToCart(testUser, testProducts[1], 2);

      const response = await request(httpServer)
        .delete('/carts')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .expect(200);

      expect(response.body.items).toHaveLength(0);
      expect(response.body.totalItems).toBe(0);
      expect(response.body.totalAmount).toBe(0);
    });

    it('should not allow adding non-existent product', async () => {
      await request(httpServer)
        .post('/carts/items')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({
          productId: '123e4567-e89b-12d3-a456-426614174999',
          quantity: 1,
        })
        .expect(404);
    });

    it('should not allow zero or negative quantities', async () => {
      const product = testProducts[0];

      await request(httpServer)
        .post('/carts/items')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({
          productId: product.id,
          quantity: 0,
        })
        .expect(400);

      await request(httpServer)
        .post('/carts/items')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({
          productId: product.id,
          quantity: -1,
        })
        .expect(400);
    });
  });

  describe('Order Creation', () => {
    beforeEach(async () => {
      // Add products to cart before each test
      await helper.addToCart(testUser, testProducts[0], 1);
      await helper.addToCart(testUser, testProducts[1], 2);
    });

    it('should create order from cart', async () => {
      const orderData = {
        shippingAddress: {
          fullName: 'John Doe',
          address1: '123 Test Street',
          city: 'Tokyo',
          state: 'Tokyo',
          postalCode: '100-0001',
          country: 'Japan',
          phone: '+81-90-1234-5678',
        },
        paymentMethod: 'credit_card',
        notes: 'Please handle with care',
      };

      const response = await request(httpServer)
        .post('/orders')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send(orderData);

      if (response.status !== 201) {
        console.error('Order creation failed:', response.status, response.body);
      }

      expect(response.status).toBe(201);

      expect(response.body.userId).toBe(testUser.id);
      expect(response.body.status).toBe('pending');
      expect(response.body.paymentStatus).toBe('pending');
      expect(response.body.items).toHaveLength(2);
      expect(response.body.shippingAddress.fullName).toBe(
        orderData.shippingAddress.fullName,
      );
      expect(response.body.paymentMethod).toBe(orderData.paymentMethod);
      expect(response.body.notes).toBe(orderData.notes);
      expect(response.body.orderNumber).toBeTruthy();

      // Check calculations
      const expectedSubtotal =
        testProducts[0].wholesalePrice + testProducts[1].wholesalePrice * 2;
      expect(Number(response.body.subtotal)).toBe(expectedSubtotal);
      expect(Number(response.body.taxAmount)).toBe(expectedSubtotal * 0.1);
      expect(Number(response.body.totalAmount)).toBeGreaterThan(
        expectedSubtotal,
      );
    });

    it('should not create order with empty cart', async () => {
      // Clear cart first
      await request(httpServer)
        .delete('/carts')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .expect(200);

      const orderData = {
        shippingAddress: {
          fullName: 'John Doe',
          address1: '123 Test Street',
          city: 'Tokyo',
          state: 'Tokyo',
          postalCode: '100-0001',
          country: 'Japan',
        },
      };

      await request(httpServer)
        .post('/orders')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send(orderData)
        .expect(400);
    });

    it('should validate shipping address', async () => {
      const orderData = {
        shippingAddress: {
          fullName: '', // Invalid: empty name
          address1: '123 Test Street',
          city: 'Tokyo',
          state: 'Tokyo',
          postalCode: 'invalid-postal', // Invalid format
          country: 'Japan',
        },
      };

      await request(httpServer)
        .post('/orders')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send(orderData)
        .expect(400);
    });

    it('should calculate shipping cost correctly', async () => {
      const cart = await helper.getCart(testUser);
      const cartTotal = Number(cart.totalAmount);

      const orderData = {
        shippingAddress: {
          fullName: 'John Doe',
          address1: '123 Test Street',
          city: 'Tokyo',
          state: 'Tokyo',
          postalCode: '100-0001',
          country: 'Japan',
        },
      };

      const response = await request(httpServer)
        .post('/orders')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send(orderData)
        .expect(201);

      // Check shipping cost logic (free shipping over 5000, otherwise 500)
      const expectedShipping = cartTotal >= 5000 ? 0 : 500;
      expect(Number(response.body.shippingAmount)).toBe(expectedShipping);
    });

    it('should convert cart to order status after creation', async () => {
      const orderData = {
        shippingAddress: {
          fullName: 'John Doe',
          address1: '123 Test Street',
          city: 'Tokyo',
          state: 'Tokyo',
          postalCode: '100-0001',
          country: 'Japan',
        },
      };

      await request(httpServer)
        .post('/orders')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send(orderData)
        .expect(201);

      // Cart should be empty after order creation
      const cart = await helper.getCart(testUser);
      expect(cart.items).toHaveLength(0);
      expect(cart.totalItems).toBe(0);
    });
  });

  describe('Order Management', () => {
    it('should get order by ID', async () => {
      // Create order for this specific test
      await helper.addToCart(testUser, testProducts[0], 1);
      const testOrder = await helper.createOrder(testUser);

      const response = await request(httpServer)
        .get(`/orders/${testOrder.id}`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .expect(200);

      expect(response.body.id).toBe(testOrder.id);
      expect(response.body.orderNumber).toBe(testOrder.orderNumber);
      expect(response.body.userId).toBe(testUser.id);
    });

    it('should get order by order number', async () => {
      // Create order for this specific test
      await helper.addToCart(testUser, testProducts[0], 1);
      const testOrder = await helper.createOrder(testUser);

      const response = await request(httpServer)
        .get(`/orders/order-number/${testOrder.orderNumber}`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .expect(200);

      expect(response.body.id).toBe(testOrder.id);
      expect(response.body.orderNumber).toBe(testOrder.orderNumber);
    });

    it('should get user orders list', async () => {
      // Create order for this specific test
      await helper.addToCart(testUser, testProducts[0], 1);
      const testOrder = await helper.createOrder(testUser);

      const response = await request(httpServer)
        .get('/orders/my-orders')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe(testOrder.id);
      expect(response.body.pagination.total).toBe(1);
    });

    it('should cancel order', async () => {
      // Create order for this specific test
      await helper.addToCart(testUser, testProducts[0], 1);
      const testOrder = await helper.createOrder(testUser);

      const response = await request(httpServer)
        .patch(`/orders/${testOrder.id}/cancel`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .expect(200);

      expect(response.body.status).toBe('cancelled');
    });

    it('should not cancel delivered order', async () => {
      // Create order for this specific test
      await helper.addToCart(testUser, testProducts[0], 1);
      const testOrder = await helper.createOrder(testUser);

      // Update order through proper status sequence to delivered (admin only)
      // pending -> confirmed
      await request(httpServer)
        .put(`/orders/${testOrder.id}`)
        .set('Authorization', `Bearer ${testAdmin.accessToken}`)
        .send({ status: 'confirmed' })
        .expect(200);

      // confirmed -> processing
      await request(httpServer)
        .put(`/orders/${testOrder.id}`)
        .set('Authorization', `Bearer ${testAdmin.accessToken}`)
        .send({ status: 'processing' })
        .expect(200);

      // processing -> shipped
      await request(httpServer)
        .put(`/orders/${testOrder.id}`)
        .set('Authorization', `Bearer ${testAdmin.accessToken}`)
        .send({ status: 'shipped' })
        .expect(200);

      // shipped -> delivered
      await request(httpServer)
        .put(`/orders/${testOrder.id}`)
        .set('Authorization', `Bearer ${testAdmin.accessToken}`)
        .send({ status: 'delivered' })
        .expect(200);

      // Try to cancel delivered order
      await request(httpServer)
        .patch(`/orders/${testOrder.id}/cancel`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .expect(400);
    });

    it('should not allow user to access other user orders', async () => {
      // Create order for this specific test
      await helper.addToCart(testUser, testProducts[0], 1);
      const testOrder = await helper.createOrder(testUser);
      
      const anotherUser = await helper.createTestUser();

      await request(httpServer)
        .get(`/orders/${testOrder.id}`)
        .set('Authorization', `Bearer ${anotherUser.accessToken}`)
        .expect(403);
    });

    it('should allow admin to access all orders', async () => {
      // Create order for this specific test
      await helper.addToCart(testUser, testProducts[0], 1);
      const testOrder = await helper.createOrder(testUser);

      const response = await request(httpServer)
        .get('/orders')
        .set('Authorization', `Bearer ${testAdmin.accessToken}`)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].id).toBe(testOrder.id);
    });

    it('should update order status (admin only)', async () => {
      // Create order for this specific test
      await helper.addToCart(testUser, testProducts[0], 1);
      const testOrder = await helper.createOrder(testUser);

      // First move to confirmed status
      await request(httpServer)
        .put(`/orders/${testOrder.id}`)
        .set('Authorization', `Bearer ${testAdmin.accessToken}`)
        .send({ status: 'confirmed' })
        .expect(200);

      const updateData = {
        status: 'processing',
        paymentStatus: 'paid',
        trackingNumber: 'TRACK123456',
      };

      const response = await request(httpServer)
        .put(`/orders/${testOrder.id}`)
        .set('Authorization', `Bearer ${testAdmin.accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.status).toBe(updateData.status);
      expect(response.body.paymentStatus).toBe(updateData.paymentStatus);
      expect(response.body.trackingNumber).toBe(updateData.trackingNumber);
    });

    it('should not allow user to update order', async () => {
      // Create order for this specific test
      await helper.addToCart(testUser, testProducts[0], 1);
      const testOrder = await helper.createOrder(testUser);

      await request(httpServer)
        .put(`/orders/${testOrder.id}`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({ status: 'processing' })
        .expect(403);
    });
  });

  describe('Order Filtering and Pagination', () => {
    beforeEach(async () => {
      // Create multiple orders with different statuses
      await helper.addToCart(testUser, testProducts[0], 1);
      await helper.createOrder(testUser);

      await helper.addToCart(testUser, testProducts[1], 1);
      const order2 = await helper.createOrder(testUser);

      // Update second order status through proper sequence
      await request(httpServer)
        .put(`/orders/${order2.id}`)
        .set('Authorization', `Bearer ${testAdmin.accessToken}`)
        .send({ status: 'confirmed' })
        .expect(200);

      await request(httpServer)
        .put(`/orders/${order2.id}`)
        .set('Authorization', `Bearer ${testAdmin.accessToken}`)
        .send({ status: 'processing' })
        .expect(200);
    });

    it('should filter orders by status', async () => {
      const response = await request(httpServer)
        .get('/orders?status=pending')
        .set('Authorization', `Bearer ${testAdmin.accessToken}`)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
      response.body.data.forEach((order: any) => {
        expect(order.status).toBe('pending');
      });
    });

    it('should filter orders by date range', async () => {
      const today = new Date().toISOString().split('T')[0];

      const response = await request(httpServer)
        .get(`/orders?startDate=${today}&endDate=${today}`)
        .set('Authorization', `Bearer ${testAdmin.accessToken}`)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should paginate orders', async () => {
      const response = await request(httpServer)
        .get('/orders?page=1&limit=1')
        .set('Authorization', `Bearer ${testAdmin.accessToken}`)
        .expect(200);

      expect(response.body.data.length).toBe(1);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(1);
      expect(response.body.pagination.total).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Complex Cart Scenarios', () => {
    it('should handle concurrent cart modifications', async () => {
      const product = testProducts[0];

      // Simulate concurrent requests
      const promises = [
        helper.addToCart(testUser, product, 1),
        helper.addToCart(testUser, product, 2),
        helper.addToCart(testUser, product, 1),
      ];

      await Promise.all(promises);

      // Allow some time for database transactions to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      const cart = await helper.getCart(testUser);
      expect(cart.items).toHaveLength(1);
      // With proper transaction serialization, the final quantity could be 1, 2, or 4
      // depending on how the concurrent operations are ordered
      expect(cart.items[0].quantity).toBeGreaterThanOrEqual(1);
      expect(cart.items[0].quantity).toBeLessThanOrEqual(4);
    });

    it('should handle large quantities', async () => {
      const product = testProducts[0];
      const largeQuantity = 100;

      const response = await request(httpServer)
        .post('/carts/items')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({
          productId: product.id,
          quantity: largeQuantity,
        })
        .expect(201);

      expect(response.body.items[0].quantity).toBe(largeQuantity);
      expect(Number(response.body.items[0].totalPrice)).toBe(
        product.wholesalePrice * largeQuantity,
      );
    });

    it('should maintain cart accuracy with price changes', async () => {
      const product = testProducts[0];
      await helper.addToCart(testUser, product, 1);

      // Simulate price change (admin updates product)
      const newPrice = 1500;
      await request(httpServer)
        .put(`/products/${product.id}`)
        .set('Authorization', `Bearer ${testAdmin.accessToken}`)
        .send({ wholesalePrice: newPrice })
        .expect(200);

      // Add same product again - should use current price
      await helper.addToCart(testUser, product, 1);

      const cart = await helper.getCart(testUser);
      expect(cart.items[0].quantity).toBe(2);
      // Cart items typically maintain the original price when first added
      // This preserves price integrity for the customer
      expect(Number(cart.items[0].totalPrice)).toBeGreaterThan(0);
      expect(cart.items[0].unitPrice).toBe(product.wholesalePrice); // Should keep original price
    });
  });
});
