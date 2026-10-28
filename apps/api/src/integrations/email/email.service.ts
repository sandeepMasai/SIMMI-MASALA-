import nodemailer from 'nodemailer';
import { env, isEmailConfigured } from '../../config/env.js';
import { logger } from '../../config/logger.js';

export async function sendEmail(input: { to: string; subject: string; text: string; html?: string }) {
  if (!isEmailConfigured()) {
    logger.warn({ to: input.to, subject: input.subject }, 'SMTP not configured; email skipped');
    return { sent: false as const, reason: 'SMTP_NOT_CONFIGURED' };
  }

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });

  await transporter.sendMail({
    from: env.SMTP_FROM,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });
  return { sent: true as const };
}
