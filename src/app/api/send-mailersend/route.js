import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { recipients, subject, message, fromEmail, fromName } = await request.json();

    const apiKey = process.env.MAILERSEND_API_KEY;
    console.log('MailerSend API Key:', apiKey ? 'Set' : 'Not set');
    console.log('API Key Length:', apiKey?.length || 0);
    console.log('Request data:', { recipients, subject, fromEmail, fromName });

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
        const mailerSendData = {
          from: {
            email: fromEmail || process.env.MAILERSEND_EMAIL,
            name: fromName || process.env.MAILERSEND_NAME || 'Ronak Bhalara'
          },
          to: [
            {
              email: recipient.email,
              name: recipient.name || recipient.email
            }
          ],
          subject: subject,
          text: message.replace(/<[^>]*>/g, ''), // Strip HTML for text version
          html: message,
          personalization: recipient.email ? [{
            email: recipient.email,
            data: {
              company: fromName || process.env.MAILERSEND_NAME || 'Ronak Bhalara'
            }
          }] : []
        };

        const response = await fetch('https://api.mailersend.com/v1/email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'Authorization': `Bearer ${apiKey.trim()}`
          },
          body: JSON.stringify(mailerSendData)
        });

        console.log('MailerSend Response Status:', response.status);
        console.log('MailerSend Response Headers:', response.headers);

        const responseData = await response.json();
        console.log('MailerSend Response Data:', responseData);

        if (response.ok && (responseData.message === 'Email sent successfully' || responseData.success)) {
          results.push({ 
            email: recipient.email, 
            status: 'success', 
            index: i + 1 
          });
        } else {
          const errorMessage = responseData.error || responseData.message || 'Failed to send';
          console.log('Error details:', errorMessage);
          
          errors.push({ 
            email: recipient.email, 
            error: errorMessage, 
            index: i + 1 
          });
        }
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
    console.error('MailerSend error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}
