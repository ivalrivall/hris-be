/* eslint-disable sonarjs/pseudo-random */
import { v1 as uuid } from 'uuid';

export class GeneratorProvider {
  static uuid(): string {
    return uuid();
  }

  static fileName(ext: string): string {
    return `${GeneratorProvider.uuid()}.${ext}`;
  }

  private static getAwsS3Config() {
    const publicBaseUrl = process.env.AWS_S3_PUBLIC_BASE_URL;
    const bucketName = process.env.AWS_S3_BUCKET_NAME;

    if (!publicBaseUrl) {
      throw new TypeError('AWS_S3_PUBLIC_BASE_URL is required');
    }

    if (!bucketName) {
      throw new TypeError('AWS_S3_BUCKET_NAME is required');
    }

    // Normalize base URL by removing trailing slashes
    const normalizedBase = publicBaseUrl.replace(/\/+$/, '');

    return { publicBaseUrl: normalizedBase, bucketName } as const;
  }

  static getS3PublicUrl(key: string): string {
    if (!key) {
      throw new TypeError('key is required');
    }

    const { publicBaseUrl } = this.getAwsS3Config();

    // Avoid duplicate slashes and ensure key has no leading slash
    const normalizedKey = String(key).replace(/^\/+/, '');

    return `${publicBaseUrl}/${encodeURI(normalizedKey)}`;
  }

  static getS3Key(publicUrl: string): string {
    if (!publicUrl) {
      throw new TypeError('key is required');
    }

    const { publicBaseUrl, bucketName } = this.getAwsS3Config();
    const prefix = `${publicBaseUrl}/${bucketName}/`;

    if (!publicUrl.startsWith(prefix)) {
      throw new TypeError('publicUrl is invalid');
    }

    const key = publicUrl.substring(prefix.length);

    if (!key) {
      throw new TypeError('publicUrl is invalid');
    }

    return decodeURI(key);
  }

  static generateVerificationCode(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  static generatePassword(): string {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = lowercase.toUpperCase();
    const numbers = '0123456789';

    let text = '';

    for (let i = 0; i < 4; i++) {
      text += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
      text += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
      text += numbers.charAt(Math.floor(Math.random() * numbers.length));
    }

    return text;
  }

  /**
   * generate random string
   * @param length
   */
  static generateRandomString(length: number): string {
    return Math.random()
      .toString(36)
      .replaceAll(/[^\dA-Za-z]+/g, '')
      .slice(0, Math.max(0, length));
  }
}
