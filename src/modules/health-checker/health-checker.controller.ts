import { Controller, Get, Inject } from '@nestjs/common';
import type { HealthCheckResult } from '@nestjs/terminus';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';

import { ServiceHealthIndicator } from './health-indicators/service.indicator.ts';

@Controller('health')
export class HealthCheckerController {
  constructor(
    @Inject(HealthCheckService) private healthCheckService: HealthCheckService,
    @Inject(TypeOrmHealthIndicator)
    private ormIndicator: TypeOrmHealthIndicator,
    @Inject(ServiceHealthIndicator)
    private serviceIndicator: ServiceHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  async check(): Promise<HealthCheckResult> {
    return this.healthCheckService.check([
      () => this.ormIndicator.pingCheck('database', { timeout: 1500 }),
      () => this.serviceIndicator.isHealthy('search-service-health'),
    ]);
  }
}
