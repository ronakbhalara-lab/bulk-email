import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request) {
  try {
    const { recipients, subject, message, smtpConfig } = await request.json();

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json(
        { error: 'Recipients array is required and cannot be empty' },
        { status: 400 }
      );
    }

    if (!subject || !message) {
      return NextResponse.json(
        { error: 'Subject and message are required' },
        { status: 400 }
      );
    }

    const transporter = nodemailer.createTransport({
      host: smtpConfig.host || 'smtp.gmail.com',
      port: smtpConfig.port || 587,
      secure: smtpConfig.port === 465,
      auth: {
        user: smtpConfig.user,
        pass: smtpConfig.password,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    const results = [];
    const errors = [];

    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      
      try {
        const mailOptions = {
          from: smtpConfig.user,
          to: recipient,
          subject: subject,
          html: message,
        };

        await transporter.sendMail(mailOptions);
        results.push({ email: recipient, status: 'success', index: i + 1 });
      } catch (error) {
        errors.push({ 
          email: recipient, 
          error: error.message, 
          index: i + 1 
        });
      }
    }

    transporter.close();

    return NextResponse.json({
      success: true,
      totalRecipients: recipients.length,
      successfulSends: results.length,
      failedSends: errors.length,
      results,
      errors,
    });

  } catch (error) {
    console.error('Bulk email error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}
