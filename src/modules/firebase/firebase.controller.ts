import {
  BadRequestException,
  Body,
  Controller,
  Param,
  Post,
} from '@nestjs/common';
import { ApiBody } from '@nestjs/swagger';

import { FirebaseService } from './firebase.service';

@Controller('fcm')
export class FirebaseController {
  constructor(private readonly firebaseService: FirebaseService) {}

  @Post(':topic/subscribe')
  async subscribeToTopic(
    @Param('topic') topic: string,
    @Body('token') token: string,
  ): Promise<{ message: string }> {
    // Subscribe a device token to a Firebase topic
    const isOk = await this.firebaseService.subscribeTokenToTopic(token, topic);

    if (!isOk) {
      throw new BadRequestException('Failed to subscribe token to topic');
    }

    return { message: `Subscribed to topic ${topic} successfully` };
  }

  @Post(':topic/unsubscribe')
  async unsubscribeFromTopic(
    @Param('topic') topic: string,
    @Body('token') token: string,
  ): Promise<{ message: string }> {
    // Unsubscribe a device token from a Firebase topic
    const isOk = await this.firebaseService.unsubscribeTokenFromTopic(
      token,
      topic,
    );

    if (!isOk) {
      throw new BadRequestException('Failed to unsubscribe token from topic');
    }

    return { message: `Unsubscribed from topic ${topic} successfully` };
  }

  @Post(':topic/send')
  @ApiBody({
    description: 'Send a push notification to a topic',
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', example: 'Maintenance Notice' },
        body: { type: 'string', example: 'Scheduled maintenance at 2 AM UTC.' },
        data: {
          type: 'object',
          additionalProperties: { type: 'string' },
          example: { action: 'open_settings', source: 'admin' },
        },
      },
      required: ['title', 'body'],
    },
  })
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
      // You can add webpush config here for web frontend
      webpush: {
        headers: {
          Urgency: 'high',
        },
        notification: {
          title,
          body,
        },
      },
    });

    if (!id) {
      throw new BadRequestException('Failed to send topic notification');
    }

    return { messageId: id };
  }
}
