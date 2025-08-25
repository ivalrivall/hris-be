import { Module } from '@nestjs/common';

import { FirebaseService } from './firebase.service.ts';

@Module({
  providers: [FirebaseService],
  exports: [FirebaseService],
})
export class FirebaseModule {}
