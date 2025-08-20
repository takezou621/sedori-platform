import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1724171523000 implements MigrationInterface {
    name = 'InitialSchema1724171523000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create ENUM types
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('user', 'admin', 'moderator')`);
        await queryRunner.query(`CREATE TYPE "public"."users_plan_enum" AS ENUM('free', 'premium', 'enterprise')`);
        await queryRunner.query(`CREATE TYPE "public"."users_status_enum" AS ENUM('active', 'inactive', 'suspended', 'pending')`);
        await queryRunner.query(`CREATE TYPE "public"."products_condition_enum" AS ENUM('new', 'like_new', 'very_good', 'good', 'acceptable', 'poor')`);
        await queryRunner.query(`CREATE TYPE "public"."products_status_enum" AS ENUM('active', 'inactive', 'out_of_stock', 'discontinued')`);
        await queryRunner.query(`CREATE TYPE "public"."sales_status_enum" AS ENUM('planned', 'purchased', 'listed', 'sold', 'cancelled', 'returned')`);
        await queryRunner.query(`CREATE TYPE "public"."sales_salechannel_enum" AS ENUM('amazon', 'rakuten', 'yahoo', 'mercari', 'ebay', 'shopify', 'other')`);
        await queryRunner.query(`CREATE TYPE "public"."recommendations_type_enum" AS ENUM('ai_generated', 'trending', 'similar_users', 'profit_potential', 'seasonal', 'custom')`);
        await queryRunner.query(`CREATE TYPE "public"."recommendations_status_enum" AS ENUM('active', 'viewed', 'clicked', 'purchased', 'dismissed', 'expired')`);

        // Create categories table
        await queryRunner.query(`CREATE TABLE "categories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(6), "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(6), "deletedAt" TIMESTAMP, "name" character varying(100) NOT NULL, "slug" character varying(120) NOT NULL, "description" text, "imageUrl" character varying(500), "sortOrder" integer NOT NULL DEFAULT '0', "isActive" boolean NOT NULL DEFAULT true, "parentId" uuid, "metadata" json, CONSTRAINT "UQ_420d9f679d41281f282f5bc7d09" UNIQUE ("slug"), CONSTRAINT "PK_24dbc6126a28ff948da33e97d3b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_categories_slug" ON "categories" ("slug") `);
        await queryRunner.query(`CREATE INDEX "idx_categories_parent" ON "categories" ("parentId") `);
        await queryRunner.query(`CREATE INDEX "idx_categories_status" ON "categories" ("isActive") `);

        // Create users table
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(6), "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(6), "deletedAt" TIMESTAMP, "name" character varying(100) NOT NULL, "email" character varying(255) NOT NULL, "password" character varying(255) NOT NULL, "role" "public"."users_role_enum" NOT NULL DEFAULT 'user', "plan" "public"."users_plan_enum" NOT NULL DEFAULT 'free', "status" "public"."users_status_enum" NOT NULL DEFAULT 'pending', "phoneNumber" character varying(20), "dateOfBirth" date, "gender" character varying(10), "bio" text, "avatarUrl" character varying(500), "lastLoginAt" TIMESTAMP, "emailVerifiedAt" TIMESTAMP, "emailVerificationToken" character varying(255), "passwordResetToken" character varying(255), "passwordResetExpiresAt" TIMESTAMP, "planStartedAt" TIMESTAMP, "planExpiresAt" TIMESTAMP, "preferences" json, "metadata" json, CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_users_email" ON "users" ("email") `);
        await queryRunner.query(`CREATE INDEX "idx_users_status" ON "users" ("status") `);
        await queryRunner.query(`CREATE INDEX "idx_users_plan" ON "users" ("plan") `);

        // Create products table
        await queryRunner.query(`CREATE TABLE "products" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(6), "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(6), "deletedAt" TIMESTAMP, "name" character varying(200) NOT NULL, "description" text, "sku" character varying(100), "brand" character varying(200), "model" character varying(100), "categoryId" uuid NOT NULL, "wholesalePrice" numeric(10,2) NOT NULL, "retailPrice" numeric(10,2), "marketPrice" numeric(10,2), "currency" character varying(3) NOT NULL DEFAULT 'JPY', "condition" "public"."products_condition_enum" NOT NULL DEFAULT 'new', "status" "public"."products_status_enum" NOT NULL DEFAULT 'active', "supplier" character varying(200) NOT NULL, "supplierUrl" character varying(500), "stockQuantity" integer, "minOrderQuantity" integer, "maxOrderQuantity" integer, "weight" numeric(5,2), "weightUnit" character varying(10) NOT NULL DEFAULT 'kg', "dimensions" character varying(100), "images" json, "primaryImageUrl" character varying(500), "specifications" json, "tags" json, "viewCount" integer NOT NULL DEFAULT '0', "averageRating" numeric(3,2) NOT NULL DEFAULT '0', "reviewCount" integer NOT NULL DEFAULT '0', "lastUpdatedAt" TIMESTAMP, "marketData" json, "profitabilityData" json, "metadata" json, CONSTRAINT "UQ_c44ac33a05b144dd0d9ddcf9327" UNIQUE ("sku"), CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_products_name" ON "products" ("name") `);
        await queryRunner.query(`CREATE INDEX "idx_products_sku" ON "products" ("sku") `);
        await queryRunner.query(`CREATE INDEX "idx_products_category" ON "products" ("categoryId") `);
        await queryRunner.query(`CREATE INDEX "idx_products_status" ON "products" ("status") `);
        await queryRunner.query(`CREATE INDEX "idx_products_supplier" ON "products" ("supplier") `);
        await queryRunner.query(`CREATE INDEX "idx_products_price" ON "products" ("wholesalePrice") `);

        // Create sales table
        await queryRunner.query(`CREATE TABLE "sales" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(6), "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(6), "deletedAt" TIMESTAMP, "userId" uuid NOT NULL, "productId" uuid NOT NULL, "status" "public"."sales_status_enum" NOT NULL DEFAULT 'planned', "saleChannel" "public"."sales_salechannel_enum", "quantity" integer NOT NULL DEFAULT '1', "purchasePrice" numeric(10,2) NOT NULL, "purchaseDate" TIMESTAMP, "purchaseLocation" character varying(200), "salePrice" numeric(10,2), "saleDate" TIMESTAMP, "saleUrl" character varying(500), "platformFee" numeric(10,2) NOT NULL DEFAULT '0', "shippingCost" numeric(10,2) NOT NULL DEFAULT '0', "otherFees" numeric(10,2) NOT NULL DEFAULT '0', "profit" numeric(10,2), "profitMargin" numeric(5,2), "roi" numeric(5,2), "daysToSell" integer, "notes" text, "tags" json, "metadata" json, CONSTRAINT "PK_4f3c76349c5040974d99327bb26" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_sales_user" ON "sales" ("userId") `);
        await queryRunner.query(`CREATE INDEX "idx_sales_product" ON "sales" ("productId") `);
        await queryRunner.query(`CREATE INDEX "idx_sales_status" ON "sales" ("status") `);
        await queryRunner.query(`CREATE INDEX "idx_sales_channel" ON "sales" ("saleChannel") `);
        await queryRunner.query(`CREATE INDEX "idx_sales_date" ON "sales" ("saleDate") `);
        await queryRunner.query(`CREATE INDEX "idx_sales_profit" ON "sales" ("profit") `);

        // Create recommendations table
        await queryRunner.query(`CREATE TABLE "recommendations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(6), "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(6), "deletedAt" TIMESTAMP, "userId" uuid NOT NULL, "productId" uuid NOT NULL, "type" "public"."recommendations_type_enum" NOT NULL DEFAULT 'ai_generated', "status" "public"."recommendations_status_enum" NOT NULL DEFAULT 'active', "score" numeric(5,4) NOT NULL, "reason" character varying(500), "viewedAt" TIMESTAMP, "clickedAt" TIMESTAMP, "purchasedAt" TIMESTAMP, "dismissedAt" TIMESTAMP, "expiresAt" TIMESTAMP, "impressionCount" integer NOT NULL DEFAULT '0', "clickCount" integer NOT NULL DEFAULT '0', "algorithmData" json, "metadata" json, CONSTRAINT "PK_0d06e8b62cd3af80358c0fea8bf" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_recommendations_user" ON "recommendations" ("userId") `);
        await queryRunner.query(`CREATE INDEX "idx_recommendations_product" ON "recommendations" ("productId") `);
        await queryRunner.query(`CREATE INDEX "idx_recommendations_type" ON "recommendations" ("type") `);
        await queryRunner.query(`CREATE INDEX "idx_recommendations_status" ON "recommendations" ("status") `);
        await queryRunner.query(`CREATE INDEX "idx_recommendations_score" ON "recommendations" ("score") `);
        await queryRunner.query(`CREATE INDEX "idx_recommendations_created" ON "recommendations" ("createdAt") `);

        // Add foreign key constraints
        await queryRunner.query(`ALTER TABLE "categories" ADD CONSTRAINT "FK_9a6f051e12274fae0e5c2d5a59d" FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "products" ADD CONSTRAINT "FK_ff0c0301a95e517153df97f6812" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sales" ADD CONSTRAINT "FK_5bb50b65e3a6d5a2c6cf3e60b6a" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sales" ADD CONSTRAINT "FK_06dd18bbf0f6c6ad063cf9dcd4b" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "recommendations" ADD CONSTRAINT "FK_bb04d8ac6142537c8c1ce9bb4a3" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "recommendations" ADD CONSTRAINT "FK_96a7e26b5c2cd4da5ca7b5ff9a6" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);

        // Install uuid-ossp extension if not exists
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign key constraints
        await queryRunner.query(`ALTER TABLE "recommendations" DROP CONSTRAINT "FK_96a7e26b5c2cd4da5ca7b5ff9a6"`);
        await queryRunner.query(`ALTER TABLE "recommendations" DROP CONSTRAINT "FK_bb04d8ac6142537c8c1ce9bb4a3"`);
        await queryRunner.query(`ALTER TABLE "sales" DROP CONSTRAINT "FK_06dd18bbf0f6c6ad063cf9dcd4b"`);
        await queryRunner.query(`ALTER TABLE "sales" DROP CONSTRAINT "FK_5bb50b65e3a6d5a2c6cf3e60b6a"`);
        await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT "FK_ff0c0301a95e517153df97f6812"`);
        await queryRunner.query(`ALTER TABLE "categories" DROP CONSTRAINT "FK_9a6f051e12274fae0e5c2d5a59d"`);

        // Drop indexes
        await queryRunner.query(`DROP INDEX "public"."idx_recommendations_created"`);
        await queryRunner.query(`DROP INDEX "public"."idx_recommendations_score"`);
        await queryRunner.query(`DROP INDEX "public"."idx_recommendations_status"`);
        await queryRunner.query(`DROP INDEX "public"."idx_recommendations_type"`);
        await queryRunner.query(`DROP INDEX "public"."idx_recommendations_product"`);
        await queryRunner.query(`DROP INDEX "public"."idx_recommendations_user"`);
        await queryRunner.query(`DROP INDEX "public"."idx_sales_profit"`);
        await queryRunner.query(`DROP INDEX "public"."idx_sales_date"`);
        await queryRunner.query(`DROP INDEX "public"."idx_sales_channel"`);
        await queryRunner.query(`DROP INDEX "public"."idx_sales_status"`);
        await queryRunner.query(`DROP INDEX "public"."idx_sales_product"`);
        await queryRunner.query(`DROP INDEX "public"."idx_sales_user"`);
        await queryRunner.query(`DROP INDEX "public"."idx_products_price"`);
        await queryRunner.query(`DROP INDEX "public"."idx_products_supplier"`);
        await queryRunner.query(`DROP INDEX "public"."idx_products_status"`);
        await queryRunner.query(`DROP INDEX "public"."idx_products_category"`);
        await queryRunner.query(`DROP INDEX "public"."idx_products_sku"`);
        await queryRunner.query(`DROP INDEX "public"."idx_products_name"`);
        await queryRunner.query(`DROP INDEX "public"."idx_users_plan"`);
        await queryRunner.query(`DROP INDEX "public"."idx_users_status"`);
        await queryRunner.query(`DROP INDEX "public"."idx_users_email"`);
        await queryRunner.query(`DROP INDEX "public"."idx_categories_status"`);
        await queryRunner.query(`DROP INDEX "public"."idx_categories_parent"`);
        await queryRunner.query(`DROP INDEX "public"."idx_categories_slug"`);

        // Drop tables
        await queryRunner.query(`DROP TABLE "recommendations"`);
        await queryRunner.query(`DROP TABLE "sales"`);
        await queryRunner.query(`DROP TABLE "products"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TABLE "categories"`);

        // Drop ENUM types
        await queryRunner.query(`DROP TYPE "public"."recommendations_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."recommendations_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."sales_salechannel_enum"`);
        await queryRunner.query(`DROP TYPE "public"."sales_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."products_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."products_condition_enum"`);
        await queryRunner.query(`DROP TYPE "public"."users_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."users_plan_enum"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
    }
}