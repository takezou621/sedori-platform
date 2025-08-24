import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSellerRole1756022750701 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add 'seller' to the users_role_enum type
        await queryRunner.query(`ALTER TYPE "public"."users_role_enum" ADD VALUE 'seller'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Note: PostgreSQL doesn't support removing enum values directly
        // This would require recreating the enum type and migrating data
        // For now, leaving it as is since removing enum values is complex
        // and generally not recommended in production
    }

}
