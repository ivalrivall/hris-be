import {
  Body,
  Controller,
  FileTypeValidator,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  MaxFileSizeValidator,
  ParseFilePipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiResponse, ApiTags } from '@nestjs/swagger';

import type { PageDto } from '../../common/dto/page.dto.ts';
import { RoleType } from '../../constants/role-type.ts';
import { ApiPageResponse } from '../../decorators/api-page-response.decorator.ts';
import { AuthUser } from '../../decorators/auth-user.decorator.ts';
import {
  ApiUUIDParam,
  Auth,
  UUIDParam,
} from '../../decorators/http.decorators.ts';
import type { IFile } from '../../interfaces/IFile';
import { FirebaseService } from '../firebase/firebase.service.ts';
import { CreateUserDto } from './dtos/create-user.dto.ts';
import { UserDto } from './dtos/user.dto.ts';
import { UserUpdateDto } from './dtos/user-update.dto.ts';
import type { UsersPageOptionsDto } from './dtos/users-page-options.dto.ts';
import type { UserEntity } from './user.entity';
import { UserService } from './user.service.ts';

@Controller('v1/users')
@ApiTags('users')
export class UserController {
  constructor(
    private userService: UserService,
    @Inject(FirebaseService) private readonly firebaseService: FirebaseService,
  ) {}

  @Post()
  @Auth([RoleType.ADMIN])
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Create user',
    type: UserDto,
  })
  @ApiBody({ type: CreateUserDto })
  /**
   * Create a user with role, password, email, and name (admin only).
   */
  async createUser(
    @Body(new ValidationPipe({ transform: true })) dto: CreateUserDto,
  ): Promise<UserDto> {
    const entity = await this.userService.createUser(dto);

    return entity.toDto();
  }

  @Get()
  @Auth([RoleType.ADMIN])
  @HttpCode(HttpStatus.OK)
  @ApiPageResponse({ type: UserDto })
  /**
   * Retrieves a paginated list of users.
   *
   * @param pageOptionsDto A UsersPageOptionsDto object containing pagination
   *   options.
   * @returns A PageDto containing an array of UserDto objects and pagination
   *   metadata.
   */
  getUsers(
    @Query() pageOptionsDto: UsersPageOptionsDto,
  ): Promise<PageDto<UserDto>> {
    return this.userService.getUsers(pageOptionsDto);
  }

  @Get(':id')
  @Auth([RoleType.ADMIN, RoleType.USER])
  @HttpCode(HttpStatus.OK)
  @ApiUUIDParam('id')
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Get user by ID',
    type: UserDto,
  })
  /**
   * Retrieves a user by their ID.
   *
   * @param userId The unique identifier of the user to retrieve.
   * @returns A UserDto object containing the user's data.
   */
  getUser(
    @UUIDParam('id') userId: Uuid,
    @AuthUser() authUser: UserEntity,
  ): Promise<UserDto> {
    if (authUser.role !== RoleType.ADMIN && authUser.id !== userId) {
      throw new ForbiddenException('You can only get detail your own account');
    }

    return this.userService.getUser(userId);
  }

  @Patch(':id')
  @Auth([RoleType.USER, RoleType.ADMIN])
  @HttpCode(HttpStatus.OK)
  @ApiUUIDParam('id')
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Update user information',
    type: UserDto,
  })
  @ApiBody({
    description: 'User data to update',
    type: UserUpdateDto,
    required: true,
  })
  /**
   * Updates a user's information.
   *
   * @param userId The unique identifier of the user to update.
   * @param userUpdateDto The user data to update.
   * @returns A UserDto object containing the updated user's data.
   */
  async updateUser(
    @UUIDParam('id') userId: Uuid,
    @AuthUser() authUser: UserEntity,
    @Body(new ValidationPipe({ transform: true }))
    userUpdateDto: UserUpdateDto,
  ): Promise<UserDto> {
    if (authUser.role !== RoleType.ADMIN && authUser.id !== userId) {
      throw new ForbiddenException('You can only update your own account');
    }

    const user = await this.userService.updateUser(userId, userUpdateDto);

    // Send topic notification to user.ADMIN on profile update
    try {
      await this.firebaseService.sendTopicNotification(
        'user.ADMIN',
        `Profile of ${authUser.name} updated`,
        'Profile information was updated successfully.',
      );
    } catch (error) {
      console.error('Failed to send push notification', error);
    }

    return user;
  }

  @Patch(':id/avatar')
  @Auth([RoleType.USER, RoleType.ADMIN])
  @HttpCode(HttpStatus.OK)
  @ApiUUIDParam('id')
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Update user avatar',
    type: UserDto,
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Avatar image file',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  /**
   * Updates a user's avatar.
   *
   * @param userId The unique identifier of the user to update.
   * @param file The avatar image file to upload. The file must be a JPEG or PNG
   *   image, and must not exceed 2MB in size.
   * @returns A UserDto object containing the updated user's data.
   */
  async updateUserAvatar(
    @UUIDParam('id') userId: Uuid,
    @AuthUser() authUser: UserEntity,
    @UploadedFile(
      new ParseFilePipe({
        // Validate file type and size
        validators: [
          new MaxFileSizeValidator({ maxSize: 2 * 1024 * 1024 }), // 2MB
          new FileTypeValidator({ fileType: /^(image\/jpeg|image\/png)$/ }),
        ],
      }),
    )
    file: IFile,
  ): Promise<UserDto> {
    if (authUser.role !== RoleType.ADMIN && authUser.id !== userId) {
      throw new ForbiddenException('You can only update your own avatar');
    }

    const user = await this.userService.updateUserAvatar(userId, file);

    // Send push notification when a regular user updates their own profile
    // Topic format: user.<ROLE>
    if (authUser.role === RoleType.USER && authUser.id === userId) {
      try {
        // Lazy import to avoid hard dependency here
        const { FirebaseService: firebaseService } = await import(
          '../firebase/firebase.service.ts'
        );
        const firebase = new firebaseService();
        await firebase.sendTopicNotification(
          `user.ADMIN`,
          `Avatar picture of ${authUser.name} updated`,
          'Avatar picture was updated successfully.',
        );
      } catch {
        console.error('Failed to send push notification');
      }
    }

    return user;
  }
}
