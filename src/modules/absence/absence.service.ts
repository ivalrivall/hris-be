import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';

import type { PageDto } from '../../common/dto/page.dto.ts';
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
  ) {}

  async createAbsence(
    userId: Uuid,
    createAbsenceDto: CreateAbsenceDto,
  ): Promise<AbsenceEntity> {
    const now = new Date(); // current time

    // Define start and end of "today" in UTC
    const startOfTodayUTC = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        0,
        0,
        0,
        0,
      ),
    );

    const endOfTodayUTC = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        23,
        59,
        59,
        999,
      ),
    );
    const existingAbsence = await this.absenceRepository.findOne({
      where: {
        userId,
        createdAt: Between(startOfTodayUTC, endOfTodayUTC),
      },
    });

    if (existingAbsence) {
      throw new BadRequestException(
        'Absence already exists for this user on this date',
      );
    }

    const absence = this.absenceRepository.create({
      userId,
      ...createAbsenceDto,
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
}
