import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmployeePosition1756080062264 implements MigrationInterface {
  name = 'AddEmployeePosition1756080062264';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "position" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "position"`);
  }
}
