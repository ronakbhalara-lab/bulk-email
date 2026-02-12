import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request) {
  try {
    const { recipients, subject, message, fromEmail, fromName } = await request.json();

    // Check if Gmail credentials are configured
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      return NextResponse.json(
        { error: 'Gmail credentials not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD environment variables.' },
        { status: 500 }
      );
    }

    // Gmail App Password setup with SSL fix
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const results = [];
    const errors = [];

    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      
      try {
        const mailOptions = {
          from: `"${fromName}" <${fromEmail}>`,
          to: recipient.email,
          subject: subject,
          html: message,
          replyTo: fromEmail
        };

        await transporter.sendMail(mailOptions);
        results.push({ 
          email: recipient.email, 
          status: 'success', 
          index: i + 1 
        });
      } catch (error) {
        errors.push({ 
          email: recipient.email, 
          error: error.message, 
          index: i + 1 
        });
      }
    }

    return NextResponse.json({
      success: true,
      totalRecipients: recipients.length,
      successfulSends: results.length,
      failedSends: errors.length,
      results,
      errors,
    });

  } catch (error) {
    console.error('Gmail error:', error);
    return NextResponse.json(
      { error: 'Failed to send emails' },
      { status: 500 }
    );
  }
}
