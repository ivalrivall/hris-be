import type { Provider } from '@nestjs/common';
import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { ClientsModule, Transport } from '@nestjs/microservices';

import { ApiConfigService } from './services/api-config.service.ts';
import { AwsS3Service } from './services/aws-s3.service.ts';
import { GeneratorService } from './services/generator.service.ts';
import { ValidatorService } from './services/validator.service.ts';

export const USER_EVENTS_RMQ = 'USER_EVENTS_RMQ';

const providers: Provider[] = [
  ApiConfigService,
  GeneratorService,
  ValidatorService,
  AwsS3Service,
];

@Global()
@Module({
  providers,
  imports: [
    CqrsModule,
    ConfigModule,
    ClientsModule.registerAsync([
      {
        name: USER_EVENTS_RMQ,
        imports: [ConfigModule],
        inject: [ApiConfigService],
        useFactory: (config: ApiConfigService) => {
          const { urls, queue, queueOptions } = config.rabbitmqConfig;

          return {
            transport: Transport.RMQ,
            options: {
              urls,
              queue,
              queueOptions,
            },
          };
        },
      },
    ]),
  ],
  exports: [...providers, CqrsModule, ClientsModule],
})
export class SharedModule {}
