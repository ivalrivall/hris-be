import { Module } from '@nestjs/common';

import { FirebaseController } from './firebase.controller';
import { FirebaseService } from './firebase.service';

@Module({
  providers: [FirebaseService],
  exports: [FirebaseService],
  controllers: [FirebaseController],
})
export class FirebaseModule {}
