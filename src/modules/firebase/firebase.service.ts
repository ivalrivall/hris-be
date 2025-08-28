import * as fs from 'node:fs';
import path from 'node:path';

import { Injectable, Logger } from '@nestjs/common';
import type { ServiceAccount } from 'firebase-admin/app';
import { applicationDefault, cert, initializeApp } from 'firebase-admin/app';
import type { Message } from 'firebase-admin/messaging';
import { getMessaging, Messaging } from 'firebase-admin/messaging';

// Options for sending a notification. Allows platform-specific overrides.
interface INotificationOptions {
  title: string;
  body: string;
  data?: Record<string, string>;
  webpush?: {
    headers?: Record<string, string>;
    notification?: {
      title?: string;
      body?: string;
      icon?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
}

type MessageBase = Pick<Message, 'notification' | 'data' | 'webpush'>;

@Injectable()
export class FirebaseService {
  private readonly logger = new Logger(FirebaseService.name);

  private initialized = false;

  constructor() {
    try {
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      let privateKey = process.env.FIREBASE_PRIVATE_KEY;

      const localJsonPath = path.resolve(
        process.cwd(),
        'hrisdexagroup-firebase-adminsdk-fbsvc-a117a3f1f8.json',
      );

      if (!this.initialized && fs.existsSync(localJsonPath)) {
        try {
          const fileBuffer = fs.readFileSync(localJsonPath);
          const fileContent = fileBuffer.toString('utf8');
          const serviceAccount = JSON.parse(fileContent) as ServiceAccount;
          initializeApp({
            credential: cert(serviceAccount),
          });
          this.initialized = true;
          this.logger.log(
            'Firebase Admin initialized with local JSON credentials',
          );
        } catch {
          this.logger.warn('Failed to initialize with local JSON credentials');
        }
      }

      if (this.initialized) {
        return;
      }

      // 2) Try explicit env vars
      if (projectId && clientEmail && privateKey) {
        // Support private keys with literal \n in env
        if (privateKey.includes(String.raw`\n`)) {
          privateKey = privateKey.replaceAll(String.raw`\n`, '\n');
        }

        initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        });

        this.initialized = true;
        this.logger.log('Firebase Admin initialized with env variables');

        return;
      }

      // 3) Fallback: application default credentials (respects GOOGLE_APPLICATION_CREDENTIALS)
      try {
        initializeApp({
          credential: applicationDefault(),
        });
        this.initialized = true;
        this.logger.log(
          'Firebase Admin initialized with application default credentials',
        );
      } catch {
        this.logger.warn(
          'Firebase credentials are not set and application default credentials are unavailable; push notifications are disabled.',
        );
      }
    } catch (error) {
      this.logger.error(
        'Failed to initialize Firebase Admin SDK',
        error instanceof Error ? error.stack : undefined,
      );
      this.initialized = false;
    }
  }

  // Get messaging instance if initialized
  private get messaging(): Messaging | null {
    if (!this.initialized) {
      return null;
    }

    try {
      return getMessaging();
    } catch (error) {
      this.logger.error(
        'Failed to access Firebase Messaging',
        error instanceof Error ? error.stack : undefined,
      );

      return null;
    }
  }

  // Build message base with optional platform-specific configs
  private buildMessageBase(options: INotificationOptions): MessageBase {
    const { title, body, data, webpush } = options;
    const base: Partial<Pick<Message, 'notification' | 'data' | 'webpush'>> = {
      notification: { title, body },
    };

    if (data) {
      base.data = data;
    }

    if (webpush) {
      base.webpush = webpush;
    }

    return base as Pick<Message, 'notification' | 'data' | 'webpush'>;
  }

  // Send to a specific device token. Returns message ID or null on failure.
  async sendToToken(
    token: string,
    options: INotificationOptions,
  ): Promise<string | null> {
    const messaging = this.messaging;

    if (!messaging) {
      this.logger.warn('Firebase not initialized; skipping push to token');

      return null;
    }

    try {
      const message: Message = {
        ...this.buildMessageBase(options),
        token,
      };

      const id = await messaging.send(message);
      this.logger.log(`Notification sent to token ${token}`);

      return id;
    } catch (error) {
      this.logger.error(
        'Failed to send push notification to token',
        error instanceof Error ? error.stack : undefined,
      );

      return null;
    }
  }

  // Send to a topic. Returns message ID or null on failure.
  async sendToTopic(
    topic: string,
    options: INotificationOptions,
  ): Promise<string | null> {
    const messaging = this.messaging;

    if (!messaging) {
      this.logger.warn('Firebase not initialized; skipping push to topic');

      return null;
    }

    try {
      const message: Message = {
        ...this.buildMessageBase(options),
        topic,
      };

      this.logger.log('message', message);

      const id = await messaging.send(message);
      this.logger.log(`Notification sent to topic ${topic} with id ${id}`);

      return id;
    } catch (error) {
      this.logger.error(
        'Failed to send push notification to topic',
        error instanceof Error ? error.stack : undefined,
      );

      return null;
    }
  }

  // Backward-compatible convenience methods
  async sendNotification(
    token: string,
    title: string,
    body: string,
  ): Promise<void> {
    await this.sendToToken(token, { title, body });
  }

  async sendTopicNotification(
    topic: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    await this.sendToTopic(topic, { title, body, data });
  }

  // Topic management helpers
  async subscribeTokenToTopic(token: string, topic: string): Promise<boolean> {
    const messaging = this.messaging;

    if (!messaging) {
      this.logger.warn(
        'Firebase not initialized; cannot subscribe token to topic',
      );

      return false;
    }

    try {
      await messaging.subscribeToTopic(token, topic);
      this.logger.log(`Subscribed token to topic ${topic}`);

      return true;
    } catch (error) {
      this.logger.error(
        'Failed to subscribe token to topic',
        error instanceof Error ? error.stack : undefined,
      );

      return false;
    }
  }

  async unsubscribeTokenFromTopic(
    token: string,
    topic: string,
  ): Promise<boolean> {
    const messaging = this.messaging;

    if (!messaging) {
      this.logger.warn(
        'Firebase not initialized; cannot unsubscribe token from topic',
      );

      return false;
    }

    try {
      await messaging.unsubscribeFromTopic(token, topic);
      this.logger.log(`Unsubscribed token from topic ${topic}`);

      return true;
    } catch (error) {
      this.logger.error(
        'Failed to unsubscribe token from topic',
        error instanceof Error ? error.stack : undefined,
      );

      return false;
    }
  }
}
