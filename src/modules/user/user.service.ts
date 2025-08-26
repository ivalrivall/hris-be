import {
  Inject,
  Injectable,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import type { FindOptionsWhere } from 'typeorm';
import { Repository } from 'typeorm';
import { Transactional } from 'typeorm-transactional';

import type { PageDto } from '../../common/dto/page.dto.ts';
import { FileNotImageException } from '../../exceptions/file-not-image.exception.ts';
import { UserNotFoundException } from '../../exceptions/user-not-found.exception.ts';
import type { IFile } from '../../interfaces/IFile.ts';
import { AwsS3Service } from '../../shared/services/aws-s3.service.ts';
import { ValidatorService } from '../../shared/services/validator.service.ts';
import { USER_EVENTS_RMQ } from '../../shared/shared.module.ts';
import type { Reference } from '../../types.ts';
import { AbsenceEntity, AbsenceStatus } from '../absence/absence.entity.ts';
import type { CreateUserDto } from './dtos/create-user.dto.ts';
import type { UserDto } from './dtos/user.dto.ts';
import type { UserUpdateDto } from './dtos/user-update.dto.ts';
import type { UsersPageOptionsDto } from './dtos/users-page-options.dto.ts';
import { UserEntity } from './user.entity';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    @InjectRepository(AbsenceEntity)
    private absenceRepository: Repository<AbsenceEntity>,
    @Inject(ValidatorService) private validatorService: ValidatorService,
    @Inject(AwsS3Service) private awsS3Service: AwsS3Service,
    @Inject(USER_EVENTS_RMQ) private userEventsClient: ClientProxy,
  ) {}

  findOne(findData: FindOptionsWhere<UserEntity>): Promise<UserEntity | null> {
    return this.userRepository.findOneBy(findData);
  }

  findByUsernameOrEmail(
    options: Partial<{ username: string; email: string }>,
  ): Promise<UserEntity | null> {
    const queryBuilder = this.userRepository.createQueryBuilder('user');

    if (options.email) {
      queryBuilder.orWhere('user.email = :email', {
        email: options.email,
      });
    }

    if (options.username) {
      queryBuilder.orWhere('user.username = :username', {
        username: options.username,
      });
    }

    return queryBuilder.getOne();
  }

  @Transactional()
  async createUser(
    userRegisterDto: CreateUserDto,
    file?: Reference<IFile>,
  ): Promise<UserEntity> {
    const user: UserEntity = this.userRepository.create({
      name: userRegisterDto.name,
      email: userRegisterDto.email,
      password: userRegisterDto.password,
      role: userRegisterDto.role,
      phone: userRegisterDto.phone ?? null,
      position: userRegisterDto.position,
    });

    if (file && !this.validatorService.isImage(file.mimetype)) {
      throw new FileNotImageException();
    }

    if (file) {
      user.avatar = await this.awsS3Service.uploadImage(file);
    }

    await this.userRepository.save(user);

    return user;
  }

  async getUsers(
    pageOptionsDto: UsersPageOptionsDto,
  ): Promise<PageDto<UserDto>> {
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      // Only select basic columns to keep the payload minimal
      .select([
        'user.id',
        'user.name',
        'user.email',
        'user.role',
        'user.avatar',
        'user.position',
        'user.phone',
        'user.createdAt',
        'user.updatedAt',
      ])
      .orderBy('user.createdAt', 'DESC');

    // Single-parameter search `q` across name, email, position, and role
    if (pageOptionsDto.q) {
      const q = `%${pageOptionsDto.q}%`;
      queryBuilder.andWhere(
        '(user.name ILIKE :q OR user.email ILIKE :q OR user.position ILIKE :q OR "user"."role"::text ILIKE :q)',
        { q },
      );
    }

    const [items, pageMetaDto] = await queryBuilder.paginate(pageOptionsDto);

    // Return without last IN/OUT augmentation to keep basic fields only
    return items.toPageDto(pageMetaDto);
  }

  async getUser(userId: Uuid): Promise<UserDto> {
    const userEntity = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!userEntity) {
      throw new UserNotFoundException();
    }

    // Fetch all absence records for the user (all time)
    const absences = await this.absenceRepository
      .createQueryBuilder('a')
      .where('a.userId = :userId', { userId })
      .orderBy('a.createdAt', 'ASC')
      .getMany();

    const firstInByDay = this.buildFirstInByDay(absences);
    const { totalWorkDay, totalPresence, totalAbsent, totalLate } =
      this.computeAttendanceMetrics(userEntity.createdAt, firstInByDay);

    return userEntity.toDto({
      totalWorkDay,
      totalPresence,
      totalAbsent,
      totalLate,
    } as never);
  }

  // Build map of YYYY-MM-DD -> first IN Date for that day (weekdays only)
  private buildFirstInByDay(absences: AbsenceEntity[]): Map<string, Date> {
    const firstInByDay = new Map<string, Date>();

    for (const a of absences) {
      const d = a.createdAt;

      if (this.isWeekend(d)) {
        continue;
      }

      if (a.status === AbsenceStatus.IN) {
        const key = this.formatDateKey(d);
        const prev = firstInByDay.get(key);

        if (!prev || d < prev) {
          firstInByDay.set(key, d);
        }
      }
    }

    return firstInByDay;
  }

  // Calculate totals from user.createdAt to today (inclusive)
  private computeAttendanceMetrics(
    userCreatedAt: Date,
    firstInByDay: Map<string, Date>,
  ): {
    totalWorkDay: number;
    totalPresence: number;
    totalAbsent: number;
    totalLate: number;
  } {
    const start = new Date(userCreatedAt);
    start.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let totalWorkDay = 0;
    let totalAbsent = 0;
    let totalPresence = 0;
    let totalLate = 0;

    for (
      const d = new Date(start);
      d.getTime() <= today.getTime();
      d.setDate(d.getDate() + 1)
    ) {
      if (this.isWeekend(d)) {
        continue;
      }

      totalWorkDay++;
      const key = this.formatDateKey(d);
      const firstIn = firstInByDay.get(key);

      if (!firstIn) {
        totalAbsent++;
        continue;
      }

      totalPresence++;
      // Late if first IN strictly after 08:00:00 local time (Asia/Jakarta)
      const threshold = new Date(firstIn);
      threshold.setHours(8, 0, 0, 0);

      if (firstIn.getTime() > threshold.getTime()) {
        totalLate++;
      }
    }

    return { totalWorkDay, totalPresence, totalAbsent, totalLate };
  }

  private isWeekend(d: Date): boolean {
    const dow = d.getDay(); // 0=Sun,6=Sat

    return dow === 0 || dow === 6;
  }

  private formatDateKey(d: Date): string {
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const dd = d.getDate().toString().padStart(2, '0');

    return `${y}-${m}-${dd}`;
  }

  async getUserWithLastAbsence(userId: Uuid): Promise<UserDto> {
    const userEntity = await this.findOne({ id: userId });

    if (!userEntity) {
      throw new UserNotFoundException();
    }

    // Fetch latest IN and OUT records separately
    const [lastIn, lastOut] = await Promise.all([
      this.absenceRepository
        .createQueryBuilder('a')
        .where('a.userId = :userId', { userId })
        .andWhere('a.status = :status', { status: AbsenceStatus.IN })
        .orderBy('a.createdAt', 'DESC')
        .getOne(),
      this.absenceRepository
        .createQueryBuilder('a')
        .where('a.userId = :userId', { userId })
        .andWhere('a.status = :status', { status: AbsenceStatus.OUT })
        .orderBy('a.createdAt', 'DESC')
        .getOne(),
    ]);

    const options = {
      lastInByUserIdDto: lastIn ? { [userId]: lastIn.toDto() } : undefined,
      lastOutByUserIdDto: lastOut ? { [userId]: lastOut.toDto() } : undefined,
    } as never;

    return userEntity.toDto(options);
  }

  @Transactional()
  async updateUser(
    userId: Uuid,
    updateUserDto: UserUpdateDto,
  ): Promise<UserDto> {
    const userEntity = await this.findOne({ id: userId });

    if (!userEntity) {
      throw new UserNotFoundException();
    }

    if (updateUserDto.phone) {
      userEntity.phone = updateUserDto.phone;
    }

    if (updateUserDto.password != null) {
      if (updateUserDto.confirmPassword == null) {
        throw new UnprocessableEntityException([
          {
            property: 'confirmPassword',
            constraints: {
              isDefined:
                'confirmPassword must be provided when password is set',
            },
          },
        ] as unknown as any);
      }

      if (updateUserDto.password !== updateUserDto.confirmPassword) {
        throw new UnprocessableEntityException([
          {
            property: 'confirmPassword',
            constraints: { sameAs: 'confirmPassword must match password' },
          },
        ] as unknown as any);
      }

      userEntity.password = updateUserDto.password;
    }

    if (updateUserDto.role) {
      userEntity.role = updateUserDto.role;
    }

    if (updateUserDto.email) {
      userEntity.email = updateUserDto.email;
    }

    if (updateUserDto.position) {
      userEntity.position = updateUserDto.position;
    }

    await this.userRepository.save(userEntity);

    const payload = {
      id: userEntity.id,
      type: 'user.updated',
      at: new Date().toISOString(),
    };
    this.userEventsClient
      .emit('user.updated', { ...payload, user: userEntity.toDto() })
      .subscribe({
        error: () => {
          this.logger.error('Failed to emit user.updated event', {
            userId: userEntity.id,
          });
        },
      });

    return userEntity.toDto();
  }

  @Transactional()
  async updateUserAvatar(
    userId: Uuid,
    file: Reference<IFile>,
  ): Promise<UserDto> {
    const userEntity = await this.findOne({ id: userId });

    if (!userEntity) {
      throw new UserNotFoundException();
    }

    if (!this.validatorService.isImage(file.mimetype)) {
      throw new FileNotImageException();
    }

    userEntity.avatar = await this.awsS3Service.uploadImage(file);
    await this.userRepository.save(userEntity);

    const payload = {
      id: userEntity.id,
      type: 'user.updated',
      at: new Date().toISOString(),
    };
    this.userEventsClient
      .emit('user.updated', { ...payload, user: userEntity.toDto() })
      .subscribe({
        error: () => {
          this.logger.error('Failed to emit user.updated event', {
            userId: userEntity.id,
          });
        },
      });

    return userEntity.toDto();
  }
}
