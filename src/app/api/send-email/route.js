import { NextResponse } from 'next/server';
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export async function POST(request) {
  try {
    const { recipients, subject, message } = await request.json();

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

    const results = [];
    const errors = [];

    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      
      try {
        const msg = {
          to: recipient,
          from: process.env.SENDGRID_FROM_EMAIL || 'test@example.com',
          subject: subject,
          html: message,
        };

        await sgMail.send(msg);
        results.push({ email: recipient, status: 'success', index: i + 1 });
      } catch (error) {
        errors.push({ 
          email: recipient, 
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
    console.error('Bulk email error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}
