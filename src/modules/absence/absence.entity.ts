import type { Relation } from 'typeorm';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

import { AbstractEntity } from '../../common/abstract.entity.ts';
import { UseDto } from '../../decorators/use-dto.decorator.ts';
import { UserEntity } from '../user/user.entity.ts';
import { AbsenceDto } from './dtos/absence.dto.ts';

export enum AbsenceStatus {
  IN = 'in',
  OUT = 'out',
}

@Entity({ name: 'absences' })
@UseDto(AbsenceDto)
export class AbsenceEntity extends AbstractEntity<AbsenceDto> {
  @Column({ type: 'uuid' })
  userId!: Uuid;

  @Column({
    type: 'enum',
    enum: AbsenceStatus,
    default: AbsenceStatus.IN,
  })
  status!: AbsenceStatus;

  @ManyToOne(() => UserEntity, (userEntity) => userEntity.absences, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user!: Relation<UserEntity>;
}
