import {
  Inject,
  Injectable,
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
import type { CreateUserDto } from './dtos/create-user.dto.ts';
import type { UserDto } from './dtos/user.dto.ts';
import type { UserUpdateDto } from './dtos/user-update.dto.ts';
import type { UsersPageOptionsDto } from './dtos/users-page-options.dto.ts';
import { UserEntity } from './user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    @Inject(ValidatorService) private validatorService: ValidatorService,
    @Inject(AwsS3Service) private awsS3Service: AwsS3Service,
    @Inject(USER_EVENTS_RMQ) private userEventsClient: ClientProxy,
  ) {}

  /**
   * Find single user
   */
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
    // Supports admin-created users
    const user = this.userRepository.create(userRegisterDto as any);

    // Explicitly assign optional phone if provided
    if (userRegisterDto.phone) {
      user.phone = userRegisterDto.phone;
    }

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

    return items.toPageDto(pageMetaDto);
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
      // Validate presence of confirmation
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

      // Ensure they match (DTO already validates, this is defensive)
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

    // Emit event for downstream consumers (e.g., MongoDB projector)
    const payload = {
      id: userEntity.id,
      type: 'user.updated',
      at: new Date().toISOString(),
    };
    // Fire-and-forget: do not block HTTP response
    this.userEventsClient
      .emit('user.updated', { ...payload, user: userEntity.toDto() })
      .subscribe({
        error: () => {},
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
