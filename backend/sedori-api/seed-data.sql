-- Sample seed data for Sedori Platform

-- Insert sample categories  
INSERT INTO categories (id, name, slug, description, "isActive", "sortOrder") VALUES
('11111111-1111-1111-1111-111111111111', '家電・PC・スマホ', 'electronics', '家電製品、PC、スマートフォンなどの電子機器', true, 1),
('22222222-2222-2222-2222-222222222222', 'ホーム・キッチン', 'home-kitchen', 'ホーム用品、キッチン用品', true, 2),
('33333333-3333-3333-3333-333333333333', 'ファッション', 'fashion', '衣類、靴、アクセサリー', true, 3),
('44444444-4444-4444-4444-444444444444', 'おもちゃ・ゲーム', 'toys-games', 'おもちゃ、ゲーム、ホビー用品', true, 4),
('55555555-5555-5555-5555-555555555555', '本・音楽・映画', 'media', '書籍、音楽、映画、DVD', true, 5);

-- Insert subcategories
INSERT INTO categories (name, slug, description, "isActive", "sortOrder", "parentId") VALUES
('スマートフォン', 'smartphones', 'iPhone、Android端末', true, 1, '11111111-1111-1111-1111-111111111111'),
('ノートPC', 'laptops', 'ノートパソコン、タブレット', true, 2, '11111111-1111-1111-1111-111111111111'),
('調理家電', 'kitchen-appliances', '電子レンジ、炊飯器等', true, 1, '22222222-2222-2222-2222-222222222222'),
('メンズファッション', 'mens-fashion', '男性向け衣類・アクセサリー', true, 1, '33333333-3333-3333-3333-333333333333'),
('レディースファッション', 'womens-fashion', '女性向け衣類・アクセサリー', true, 2, '33333333-3333-3333-3333-333333333333');

-- Insert sample products
INSERT INTO products (id, name, description, sku, brand, "categoryId", "wholesalePrice", "retailPrice", "marketPrice", supplier, "stockQuantity", condition, status) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'iPhone 14 Pro 128GB', 'Apple iPhone 14 Pro 128GB スペースブラック', 'IPH14P128SB', 'Apple', (SELECT id FROM categories WHERE slug = 'smartphones'), 98000.00, 149800.00, 135000.00, '卸売業者A', 50, 'new', 'active'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'MacBook Air M2 13inch', 'Apple MacBook Air M2チップ搭載 13インチ', 'MBA13M2', 'Apple', (SELECT id FROM categories WHERE slug = 'laptops'), 120000.00, 164800.00, 155000.00, '卸売業者B', 30, 'new', 'active'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Panasonic 炊飯器', 'パナソニック 5.5合炊き IH炊飯器', 'PAN-RC5', 'Panasonic', (SELECT id FROM categories WHERE slug = 'kitchen-appliances'), 15000.00, 28000.00, 25000.00, '家電卸売C', 100, 'new', 'active'),
('dddddddd-dddd-dddd-dddd-dddddddddddd', 'ユニクロ メンズTシャツ', 'ユニクロ エアリズム メンズTシャツ Mサイズ', 'UNI-AIRT-M', 'UNIQLO', (SELECT id FROM categories WHERE slug = 'mens-fashion'), 800.00, 1500.00, 1200.00, 'アパレル問屋D', 200, 'new', 'active'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Nintendo Switch', '任天堂 Nintendo Switch 本体', 'NSW-MAIN', 'Nintendo', (SELECT id FROM categories WHERE slug = 'toys-games'), 25000.00, 32978.00, 30000.00, 'ゲーム卸売E', 80, 'new', 'active');

-- Update products with additional data
UPDATE products SET 
  "marketData" = '{
    "amazonPrice": 134000,
    "rakutenPrice": 136000,
    "yahooPrice": 135500,
    "mercariPrice": 125000,
    "averageSellingPrice": 132625,
    "competitorCount": 150,
    "demandScore": 0.85,
    "trendScore": 0.90,
    "lastScrapedAt": "2024-08-20T12:00:00Z"
  }',
  "profitabilityData" = '{
    "estimatedProfit": 34625,
    "profitMargin": 0.35,
    "roi": 0.35,
    "breakEvenDays": 15,
    "riskLevel": "low",
    "calculatedAt": "2024-08-20T12:00:00Z"
  }',
  tags = '["人気", "高利益", "回転早い"]'
WHERE sku = 'IPH14P128SB';

UPDATE products SET 
  "marketData" = '{
    "amazonPrice": 154000,
    "rakutenPrice": 156000,
    "yahooPrice": 155000,
    "mercariPrice": 148000,
    "averageSellingPrice": 153250,
    "competitorCount": 80,
    "demandScore": 0.75,
    "trendScore": 0.85,
    "lastScrapedAt": "2024-08-20T12:00:00Z"
  }',
  "profitabilityData" = '{
    "estimatedProfit": 33250,
    "profitMargin": 0.28,
    "roi": 0.28,
    "breakEvenDays": 20,
    "riskLevel": "low",
    "calculatedAt": "2024-08-20T12:00:00Z"
  }',
  tags = '["MacBook", "高価格", "需要安定"]'
WHERE sku = 'MBA13M2';

-- Insert sample users (passwords are hashed - in real app, use bcrypt)
INSERT INTO users (id, name, email, password, role, plan, status, "emailVerifiedAt") VALUES
('99999999-9999-9999-9999-999999999999', '管理者', 'admin@sedori.com', '$2b$10$hashedpasswordexample', 'admin', 'enterprise', 'active', NOW()),
('88888888-8888-8888-8888-888888888888', 'テストユーザー', 'test@example.com', '$2b$10$hashedpasswordexample', 'user', 'free', 'active', NOW()),
('77777777-7777-7777-7777-777777777777', 'プレミアムユーザー', 'premium@example.com', '$2b$10$hashedpasswordexample', 'user', 'premium', 'active', NOW());