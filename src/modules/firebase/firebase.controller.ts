import {
  BadRequestException,
  Body,
  Controller,
  Param,
  Post,
} from '@nestjs/common';

import { FirebaseService } from './firebase.service';

@Controller('fcm')
export class FirebaseController {
  constructor(private readonly firebaseService: FirebaseService) {}

  @Post(':topic/subscribe')
  async subscribeToTopic(
    @Param('topic') topic: string,
    @Body('token') token: string,
  ): Promise<string> {
    // Subscribe a device token to a Firebase topic
    const isOk = await this.firebaseService.subscribeTokenToTopic(token, topic);

    if (!isOk) {
      throw new BadRequestException('Failed to subscribe token to topic');
    }

    return `Subscribed to topic ${topic} successfully`;
  }

  @Post(':topic/unsubscribe')
  async unsubscribeFromTopic(
    @Param('topic') topic: string,
    @Body('token') token: string,
  ): Promise<string> {
    // Unsubscribe a device token from a Firebase topic
    const isOk = await this.firebaseService.unsubscribeTokenFromTopic(
      token,
      topic,
    );

    if (!isOk) {
      throw new BadRequestException('Failed to unsubscribe token from topic');
    }

    return `Unsubscribed from topic ${topic} successfully`;
  }

  @Post(':topic/send')
  async sendToTopicMessage(
    @Param('topic') topic: string,
    @Body('title') title: string,
    @Body('body') body: string,
    @Body('data') data?: Record<string, string>,
  ): Promise<{ messageId: string }> {
    // Send a push notification to all subscribers of a topic
    const id = await this.firebaseService.sendToTopic(topic, {
      title,
      body,
      data,
    });

    if (!id) {
      throw new BadRequestException('Failed to send topic notification');
    }

    return { messageId: id };
  }
}
