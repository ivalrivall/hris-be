import { DateField, UUIDField } from '../../decorators/field.decorators.ts';
import type { AbstractEntity } from '../abstract.entity.ts';

export class AbstractDto {
  @UUIDField()
  id!: Uuid;

  @DateField()
  createdAt!: Date;

  @DateField()
  updatedAt!: Date;

  constructor(entity: AbstractEntity) {
    this.id = entity.id;
    this.createdAt = entity.createdAt;
    this.updatedAt = entity.updatedAt;
  }
}
