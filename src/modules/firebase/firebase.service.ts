import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';

// Options for sending a notification. Allows platform-specific overrides.
interface INotificationOptions {
  title: string;
  body: string;
  data?: Record<string, string>;
  android?: admin.messaging.AndroidConfig;
  apns?: admin.messaging.ApnsConfig;
  webpush?: admin.messaging.WebpushConfig;
}

@Injectable()
export class FirebaseService {
  private readonly logger = new Logger(FirebaseService.name);

  private initialized = false;

  constructor() {
    try {
      if (admin.apps.length > 0) {
        // Already initialized elsewhere
        this.initialized = true;

        return;
      }

      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      let privateKey = process.env.FIREBASE_PRIVATE_KEY;

      if (!projectId || !clientEmail || !privateKey) {
        this.logger.warn(
          'Firebase credentials are not fully set; push notifications are disabled.',
        );

        return;
      }

      // Support private keys with literal \n in env
      if (privateKey.includes(String.raw`\n`)) {
        privateKey = privateKey.replaceAll(String.raw`\n`, '\n');
      }

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });

      this.initialized = true;
      this.logger.log('Firebase Admin initialized');
    } catch (error) {
      this.logger.error(
        'Failed to initialize Firebase Admin SDK',
        error instanceof Error ? error.stack : undefined,
      );
      this.initialized = false;
    }
  }

  // Get messaging instance if initialized
  private get messaging(): admin.messaging.Messaging | null {
    if (!this.initialized) {
      return null;
    }

    try {
      return admin.messaging();
    } catch (error) {
      this.logger.error(
        'Failed to access Firebase Messaging',
        error instanceof Error ? error.stack : undefined,
      );

      return null;
    }
  }

  // Build message base with optional platform-specific configs
  private buildMessageBase(
    options: INotificationOptions,
  ): Pick<
    admin.messaging.Message,
    'notification' | 'data' | 'android' | 'apns' | 'webpush'
  > {
    const { title, body, data, android, apns, webpush } = options;

    const base: Partial<
      Pick<
        admin.messaging.Message,
        'notification' | 'data' | 'android' | 'apns' | 'webpush'
      >
    > = {
      notification: { title, body },
    };

    if (data) {
      base.data = data;
    }

    if (android) {
      base.android = android;
    }

    if (apns) {
      base.apns = apns;
    }

    if (webpush) {
      base.webpush = webpush;
    }

    return base as Pick<
      admin.messaging.Message,
      'notification' | 'data' | 'android' | 'apns' | 'webpush'
    >;
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
      const message: admin.messaging.Message = {
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
      const message: admin.messaging.Message = {
        ...this.buildMessageBase(options),
        topic,
      };

      const id = await messaging.send(message);
      this.logger.log(`Notification sent to topic ${topic}`);

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
  ): Promise<void> {
    await this.sendToTopic(topic, { title, body });
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
