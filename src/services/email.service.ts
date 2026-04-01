import nodemailer, { Transporter } from 'nodemailer';

import { EmailConfig } from '../types/common.type';
import {
  companyVerificationEmailHtml,
  templatesUtil,
} from '../utils/templates.util';

/**
 * Email Service - Handles all email operations
 * Implements Singleton pattern
 */
export class EmailService {
  private static instance: EmailService;
  private readonly transporter: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      secure: false,
      requireTLS: false,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASS,
      },
    });
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  /**
   * Send a generic email
   */
  public async sendEmail(config: EmailConfig): Promise<void> {
    try {
      await this.transporter.sendMail(config);
    } catch (error: any) {
      console.error('Error sending email:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  /**
   * Send verification email to user
   */
  public async sendVerificationEmail(
    email: string,
    token: string
  ): Promise<void> {
    const config: EmailConfig = {
      from: process.env.GMAIL_USER!,
      to: email,
      subject: 'Confirma tu cuenta',
      html: templatesUtil(token),
    };

    await this.sendEmail(config);
  }

  /**
   * Send company verification email to admin
   */
  public async sendCompanyVerificationEmail(
    token: string,
    company: any,
    user: any
  ): Promise<void> {
    const config: EmailConfig = {
      from: process.env.GMAIL_USER!,
      to: process.env.GMAIL_USER!,
      subject: 'Nueva solicitud de empresa',
      html: companyVerificationEmailHtml(token, company, user),
    };

    await this.sendEmail(config);
  }
}

// Export singleton instance
export const emailService = EmailService.getInstance();
