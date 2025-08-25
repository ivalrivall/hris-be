import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';

import type { PageDto } from '../../common/dto/page.dto.ts';
import { RoleType } from '../../constants/role-type.ts';
import { UserEntity } from '../user/user.entity.ts';
import { AbsenceEntity } from './absence.entity.ts';
import { AbsenceDto } from './dtos/absence.dto.ts';
import type { AbsencePageOptionsDto } from './dtos/absence-page-options.dto.ts';
import type { CreateAbsenceDto } from './dtos/create-absence.dto.ts';
import type { UpdateAbsenceDto } from './dtos/update-absence.dto.ts';

@Injectable()
export class AbsenceService {
  constructor(
    @InjectRepository(AbsenceEntity)
    private absenceRepository: Repository<AbsenceEntity>,
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
  ) {}

  async createAbsence(
    userId: Uuid,
    createAbsenceDto: CreateAbsenceDto,
  ): Promise<AbsenceEntity> {
    // Verify that the user has the USER role
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== RoleType.USER) {
      throw new BadRequestException(
        'Only users with USER role can create absences',
      );
    }

    const now = new Date(); // current time in Asia/Jakarta timezone

    // Get the start of today in Asia/Jakarta timezone
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    // Get the end of today in Asia/Jakarta timezone
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    const existingAbsence = await this.absenceRepository.findOne({
      where: {
        userId,
        createdAt: Between(startOfToday, endOfToday),
      },
    });

    if (existingAbsence && existingAbsence.status === createAbsenceDto.status) {
      throw new BadRequestException(
        `Absence with status '${createAbsenceDto.status}' already exists for this employee today`,
      );
    }

    const absence = this.absenceRepository.create({
      userId,
      status: createAbsenceDto.status,
    });

    return this.absenceRepository.save(absence);
  }

  async getAllAbsence(
    pageOptionsDto: AbsencePageOptionsDto,
  ): Promise<PageDto<AbsenceDto>> {
    const queryBuilder = this.absenceRepository.createQueryBuilder('absence');
    const [items, pageMetaDto] = await queryBuilder.paginate(pageOptionsDto);

    return items.toPageDto(pageMetaDto);
  }

  async getSingleAbsence(id: Uuid): Promise<AbsenceEntity> {
    const queryBuilder = this.absenceRepository
      .createQueryBuilder('absence')
      .where('absence.id = :id', { id });

    const absenceEntity = await queryBuilder.getOne();

    if (!absenceEntity) {
      throw new NotFoundException('Absence not found');
    }

    return absenceEntity;
  }

  async updateAbsence(
    id: Uuid,
    updateAbsenceDto: UpdateAbsenceDto,
  ): Promise<void> {
    const queryBuilder = this.absenceRepository
      .createQueryBuilder('absence')
      .where('absence.id = :id', { id });

    const absenceEntity = await queryBuilder.getOne();

    if (!absenceEntity) {
      throw new NotFoundException('Absence not found');
    }

    this.absenceRepository.merge(absenceEntity, updateAbsenceDto);

    await this.absenceRepository.save(absenceEntity);
  }

  async deleteAbsence(id: Uuid): Promise<void> {
    const queryBuilder = this.absenceRepository
      .createQueryBuilder('absence')
      .where('absence.id = :id', { id });

    const absenceEntity = await queryBuilder.getOne();

    if (!absenceEntity) {
      throw new NotFoundException('Absence not found');
    }

    await this.absenceRepository.remove(absenceEntity);
  }

  async getTodayAbsenceForUser(userId: Uuid): Promise<AbsenceEntity[]> {
    const now = new Date(); // current time in Asia/Jakarta timezone

    // Get the start of today in Asia/Jakarta timezone
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    // Get the end of today in Asia/Jakarta timezone
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    const queryBuilder = this.absenceRepository
      .createQueryBuilder('absence')
      .where('absence.userId = :userId', { userId })
      .andWhere('absence.createdAt BETWEEN :startOfToday AND :endOfToday', {
        startOfToday,
        endOfToday,
      })
      .orderBy('absence.createdAt', 'DESC');

    return queryBuilder.getMany();
  }
}
