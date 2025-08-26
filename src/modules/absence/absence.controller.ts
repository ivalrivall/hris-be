import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import type { PageDto } from '../../common/dto/page.dto.ts';
import { RoleType } from '../../constants/role-type.ts';
import { ApiPageResponse } from '../../decorators/api-page-response.decorator.ts';
import { AuthUser } from '../../decorators/auth-user.decorator.ts';
import {
  ApiUUIDParam,
  Auth,
  UUIDParam,
} from '../../decorators/http.decorators.ts';
import type { UserEntity } from '../user/user.entity.ts';
import { AbsenceService } from './absence.service.ts';
import { AbsenceDto } from './dtos/absence.dto.ts';
import { AbsencePageOptionsDto } from './dtos/absence-page-options.dto.ts';
import { CreateAbsenceDto } from './dtos/create-absence.dto.ts';
import { UpdateAbsenceDto } from './dtos/update-absence.dto.ts';

@Controller('v1/absences')
@ApiTags('absences')
export class AbsenceController {
  constructor(private absenceService: AbsenceService) {}

  @Post()
  @Auth([RoleType.USER])
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ type: AbsenceDto })
  async createAbsence(
    @Body() createAbsenceDto: CreateAbsenceDto,
    @AuthUser() user: UserEntity,
  ): Promise<AbsenceDto> {
    const absenceEntity = await this.absenceService.createAbsence(
      user.id,
      createAbsenceDto,
    );

    return absenceEntity.toDto();
  }

  @Get()
  @Auth([RoleType.ADMIN])
  @HttpCode(HttpStatus.OK)
  @ApiPageResponse({ type: AbsenceDto })
  async getAllAbsences(
    @Query() pageOptionsDto: AbsencePageOptionsDto,
  ): Promise<PageDto<AbsenceDto>> {
    return this.absenceService.getAllAbsence(pageOptionsDto);
  }

  @Get('user/:id')
  @Auth([RoleType.ADMIN, RoleType.USER])
  @HttpCode(HttpStatus.OK)
  @ApiPageResponse({ type: AbsenceDto })
  @ApiUUIDParam('id')
  async getAllAbsencesOfUser(
    @UUIDParam('id') userId: Uuid,
    @Query() pageOptionsDto: AbsencePageOptionsDto,
    @AuthUser() authUser: UserEntity,
  ): Promise<PageDto<AbsenceDto>> {
    if (authUser.role !== RoleType.ADMIN && authUser.id !== userId) {
      throw new ForbiddenException('You can only get detail your own account');
    }

    return this.absenceService.getAllAbsenceOfUser(userId, pageOptionsDto);
  }

  @Get('today/me')
  @Auth([RoleType.USER])
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: [AbsenceDto] })
  async getTodayAbsenceForCurrentUser(
    @AuthUser() user: UserEntity,
  ): Promise<AbsenceDto[]> {
    const absenceEntities = await this.absenceService.getTodayAbsenceForUser(
      user.id,
    );

    return absenceEntities.map((entity) => entity.toDto());
  }

  @Get(':id')
  @Auth([RoleType.USER, RoleType.ADMIN])
  @HttpCode(HttpStatus.OK)
  @ApiUUIDParam('id')
  @ApiOkResponse({ type: AbsenceDto })
  async getSingleAbsence(@UUIDParam('id') id: Uuid): Promise<AbsenceDto> {
    const entity = await this.absenceService.getSingleAbsence(id);

    return entity.toDto();
  }

  @Put(':id')
  @Auth([RoleType.USER, RoleType.ADMIN])
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiUUIDParam('id')
  @ApiAcceptedResponse()
  updateAbsence(
    @UUIDParam('id') id: Uuid,
    @Body() updateAbsenceDto: UpdateAbsenceDto,
  ): Promise<void> {
    return this.absenceService.updateAbsence(id, updateAbsenceDto);
  }

  @Delete(':id')
  @Auth([RoleType.USER, RoleType.ADMIN])
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiUUIDParam('id')
  @ApiAcceptedResponse()
  async deleteAbsence(@UUIDParam('id') id: Uuid): Promise<void> {
    await this.absenceService.deleteAbsence(id);
  }
}
