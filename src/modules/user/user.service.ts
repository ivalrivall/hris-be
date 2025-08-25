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
    const queryBuilder = this.userRepository.createQueryBuilder('user');
    const [items, pageMetaDto] = await queryBuilder.paginate(pageOptionsDto);

    // Fetch last absence per user for the current page (Postgres DISTINCT ON)
    const ids = items.map((u) => u.id);
    let lastInByUserIdDto: Record<
      string,
      ReturnType<AbsenceEntity['toDto']>
    > = {};
    let lastOutByUserIdDto: Record<
      string,
      ReturnType<AbsenceEntity['toDto']>
    > = {};

    if (ids.length > 0) {
      const [lastIns, lastOuts] = await Promise.all([
        this.absenceRepository
          .createQueryBuilder('a')
          .where('a.userId IN (:...ids)', { ids })
          .andWhere('a.status = :status', { status: AbsenceStatus.IN })
          .distinctOn(['a.userId'])
          .orderBy('a.userId', 'ASC')
          .addOrderBy('a.createdAt', 'DESC')
          .getMany(),
        this.absenceRepository
          .createQueryBuilder('a')
          .where('a.userId IN (:...ids)', { ids })
          .andWhere('a.status = :status', { status: AbsenceStatus.OUT })
          .distinctOn(['a.userId'])
          .orderBy('a.userId', 'ASC')
          .addOrderBy('a.createdAt', 'DESC')
          .getMany(),
      ]);

      lastInByUserIdDto = lastIns.reduce<
        Record<string, ReturnType<AbsenceEntity['toDto']>>
      >((acc, a) => {
        acc[a.userId] = a.toDto();

        return acc;
      }, {});

      lastOutByUserIdDto = lastOuts.reduce<
        Record<string, ReturnType<AbsenceEntity['toDto']>>
      >((acc, a) => {
        acc[a.userId] = a.toDto();

        return acc;
      }, {});
    }

    return items.toPageDto(pageMetaDto, {
      lastInByUserIdDto,
      lastOutByUserIdDto,
    });
  }

  async getUser(userId: Uuid): Promise<UserDto> {
    const queryBuilder = this.userRepository.createQueryBuilder('user');

    queryBuilder.where('user.id = :userId', { userId });

    const userEntity = await queryBuilder.getOne();

    if (!userEntity) {
      throw new UserNotFoundException();
    }

    return userEntity.toDto();
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

    return userEntity.toDto();
  }
}
