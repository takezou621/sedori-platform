import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Notification } from '../entities/notification.entity';
import { NotificationType } from '../dto/create-notification.dto';

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

@Injectable()
export class EmailNotificationService {
  private readonly logger = new Logger(EmailNotificationService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    const smtpConfig = {
      host: this.configService.get('SMTP_HOST', 'smtp.gmail.com'),
      port: this.configService.get('SMTP_PORT', 587),
      secure: this.configService.get('SMTP_SECURE', false),
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASS'),
      },
    };

    if (!smtpConfig.auth.user || !smtpConfig.auth.pass) {
      this.logger.warn(
        'SMTP credentials not configured. Email notifications will be simulated.',
      );
      this.transporter = null as any;
      return;
    }

    this.transporter = nodemailer.createTransport(smtpConfig);

    // Verify SMTP connection
    this.transporter.verify((error, success) => {
      if (error) {
        this.logger.error('SMTP connection failed:', error);
      } else {
        this.logger.log('SMTP connection established successfully');
      }
    });
  }

  async sendNotification(notification: Notification): Promise<void> {
    try {
      if (!this.transporter) {
        this.logger.log(
          `[SIMULATED] Email notification sent to user ${notification.userId}: ${notification.title}`,
        );
        return;
      }

      const template = this.getEmailTemplate(notification);

      const mailOptions = {
        from: {
          name: this.configService.get('EMAIL_FROM_NAME', 'Sedori Platform'),
          address: this.configService.get(
            'EMAIL_FROM_ADDRESS',
            'noreply@sedori-platform.com',
          ),
        },
        to: await this.getUserEmail(notification.userId),
        subject: template.subject,
        html: template.html,
        text: template.text,
        headers: {
          'X-Notification-ID': notification.id,
          'X-Notification-Type': notification.type,
        },
      };

      const result = await this.transporter.sendMail(mailOptions);

      this.logger.log(
        `Email notification sent successfully to ${mailOptions.to}. Message ID: ${result.messageId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send email notification ${notification.id}:`,
        error,
      );
      throw error;
    }
  }

  async sendBulkEmails(
    recipients: string[],
    subject: string,
    htmlContent: string,
    textContent?: string,
  ): Promise<void> {
    if (!this.transporter) {
      this.logger.log(
        `[SIMULATED] Bulk email sent to ${recipients.length} recipients: ${subject}`,
      );
      return;
    }

    try {
      const mailOptions = {
        from: {
          name: this.configService.get('EMAIL_FROM_NAME', 'Sedori Platform'),
          address: this.configService.get(
            'EMAIL_FROM_ADDRESS',
            'noreply@sedori-platform.com',
          ),
        },
        bcc: recipients,
        subject,
        html: htmlContent,
        text: textContent || this.stripHtml(htmlContent),
      };

      const result = await this.transporter.sendMail(mailOptions);

      this.logger.log(
        `Bulk email sent successfully to ${recipients.length} recipients. Message ID: ${result.messageId}`,
      );
    } catch (error) {
      this.logger.error('Failed to send bulk email:', error);
      throw error;
    }
  }

  private getEmailTemplate(notification: Notification): EmailTemplate {
    const baseUrl = this.configService.get(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
    const logoUrl = `${baseUrl}/images/logo.png`;

    switch (notification.type) {
      case NotificationType.PRICE_ALERT:
        return this.getPriceAlertTemplate(notification, baseUrl, logoUrl);

      case NotificationType.STOCK_UPDATE:
        return this.getStockUpdateTemplate(notification, baseUrl, logoUrl);

      case NotificationType.ORDER_STATUS:
        return this.getOrderStatusTemplate(notification, baseUrl, logoUrl);

      case NotificationType.PROMOTION:
        return this.getPromotionTemplate(notification, baseUrl, logoUrl);

      case NotificationType.SYSTEM:
        return this.getSystemTemplate(notification, baseUrl, logoUrl);

      case NotificationType.COMMUNITY:
        return this.getCommunityTemplate(notification, baseUrl, logoUrl);

      default:
        return this.getGenericTemplate(notification, baseUrl, logoUrl);
    }
  }

  private getPriceAlertTemplate(
    notification: Notification,
    baseUrl: string,
    logoUrl: string,
  ): EmailTemplate {
    const productName = notification.data?.productName || 'Product';
    const currentPrice = notification.data?.currentPrice;
    const targetPrice = notification.data?.targetPrice;

    return {
      subject: `価格アラート: ${productName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
            <img src="${logoUrl}" alt="Sedori Platform" style="height: 40px;">
          </div>
          <div style="padding: 20px;">
            <h2 style="color: #28a745;">価格アラート通知</h2>
            <p>お待ちかねの商品の価格が目標価格に達しました！</p>
            <div style="background-color: #e9ecef; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0;">${productName}</h3>
              <p><strong>現在価格:</strong> ¥${currentPrice?.toLocaleString()}</p>
              <p><strong>目標価格:</strong> ¥${targetPrice?.toLocaleString()}</p>
            </div>
            ${notification.actionUrl ? `<p style="text-align: center;"><a href="${notification.actionUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">商品を確認する</a></p>` : ''}
            <p style="font-size: 12px; color: #6c757d;">このメールは価格アラート設定に基づいて送信されました。</p>
          </div>
        </div>
      `,
      text: `価格アラート通知\n\n${productName}の価格が目標価格に達しました。\n現在価格: ¥${currentPrice?.toLocaleString()}\n目標価格: ¥${targetPrice?.toLocaleString()}\n\n${notification.actionUrl || ''}`,
    };
  }

  private getStockUpdateTemplate(
    notification: Notification,
    baseUrl: string,
    logoUrl: string,
  ): EmailTemplate {
    return {
      subject: notification.title,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
            <img src="${logoUrl}" alt="Sedori Platform" style="height: 40px;">
          </div>
          <div style="padding: 20px;">
            <h2 style="color: #17a2b8;">在庫更新通知</h2>
            <p>${notification.message}</p>
            ${notification.actionUrl ? `<p style="text-align: center;"><a href="${notification.actionUrl}" style="background-color: #17a2b8; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">詳細を確認</a></p>` : ''}
          </div>
        </div>
      `,
      text: `在庫更新通知\n\n${notification.message}\n\n${notification.actionUrl || ''}`,
    };
  }

  private getOrderStatusTemplate(
    notification: Notification,
    baseUrl: string,
    logoUrl: string,
  ): EmailTemplate {
    return {
      subject: notification.title,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
            <img src="${logoUrl}" alt="Sedori Platform" style="height: 40px;">
          </div>
          <div style="padding: 20px;">
            <h2 style="color: #28a745;">注文状況更新</h2>
            <p>${notification.message}</p>
            ${notification.actionUrl ? `<p style="text-align: center;"><a href="${notification.actionUrl}" style="background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">注文を確認</a></p>` : ''}
          </div>
        </div>
      `,
      text: `注文状況更新\n\n${notification.message}\n\n${notification.actionUrl || ''}`,
    };
  }

  private getPromotionTemplate(
    notification: Notification,
    baseUrl: string,
    logoUrl: string,
  ): EmailTemplate {
    return {
      subject: notification.title,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
            <img src="${logoUrl}" alt="Sedori Platform" style="height: 40px;">
          </div>
          <div style="padding: 20px;">
            <h2 style="color: #dc3545;">特別オファー</h2>
            <p>${notification.message}</p>
            ${notification.imageUrl ? `<div style="text-align: center; margin: 20px 0;"><img src="${notification.imageUrl}" alt="Promotion" style="max-width: 100%; height: auto;"></div>` : ''}
            ${notification.actionUrl ? `<p style="text-align: center;"><a href="${notification.actionUrl}" style="background-color: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">オファーを確認</a></p>` : ''}
          </div>
        </div>
      `,
      text: `特別オファー\n\n${notification.message}\n\n${notification.actionUrl || ''}`,
    };
  }

  private getSystemTemplate(
    notification: Notification,
    baseUrl: string,
    logoUrl: string,
  ): EmailTemplate {
    return {
      subject: notification.title,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
            <img src="${logoUrl}" alt="Sedori Platform" style="height: 40px;">
          </div>
          <div style="padding: 20px;">
            <h2 style="color: #6c757d;">システム通知</h2>
            <p>${notification.message}</p>
            ${notification.actionUrl ? `<p style="text-align: center;"><a href="${notification.actionUrl}" style="background-color: #6c757d; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">詳細を確認</a></p>` : ''}
          </div>
        </div>
      `,
      text: `システム通知\n\n${notification.message}\n\n${notification.actionUrl || ''}`,
    };
  }

  private getCommunityTemplate(
    notification: Notification,
    baseUrl: string,
    logoUrl: string,
  ): EmailTemplate {
    return {
      subject: notification.title,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
            <img src="${logoUrl}" alt="Sedori Platform" style="height: 40px;">
          </div>
          <div style="padding: 20px;">
            <h2 style="color: #6f42c1;">コミュニティ通知</h2>
            <p>${notification.message}</p>
            ${notification.actionUrl ? `<p style="text-align: center;"><a href="${notification.actionUrl}" style="background-color: #6f42c1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">コミュニティを確認</a></p>` : ''}
          </div>
        </div>
      `,
      text: `コミュニティ通知\n\n${notification.message}\n\n${notification.actionUrl || ''}`,
    };
  }

  private getGenericTemplate(
    notification: Notification,
    baseUrl: string,
    logoUrl: string,
  ): EmailTemplate {
    return {
      subject: notification.title,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
            <img src="${logoUrl}" alt="Sedori Platform" style="height: 40px;">
          </div>
          <div style="padding: 20px;">
            <h2>${notification.title}</h2>
            <p>${notification.message}</p>
            ${notification.imageUrl ? `<div style="text-align: center; margin: 20px 0;"><img src="${notification.imageUrl}" alt="Notification" style="max-width: 100%; height: auto;"></div>` : ''}
            ${notification.actionUrl ? `<p style="text-align: center;"><a href="${notification.actionUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">詳細を確認</a></p>` : ''}
          </div>
        </div>
      `,
      text: `${notification.title}\n\n${notification.message}\n\n${notification.actionUrl || ''}`,
    };
  }

  private async getUserEmail(userId: string): Promise<string> {
    // TODO: Implement user service lookup
    // This should fetch the user's email from the database
    this.logger.warn(`User email lookup not implemented for user ${userId}`);
    return `user${userId}@example.com`; // Fallback
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  async testConnection(): Promise<boolean> {
    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      this.logger.error('Email service connection test failed:', error);
      return false;
    }
  }
}
