import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Import the progress broadcast function
let broadcastProgress = null;
if (typeof global.emailProgressBroadcast === 'function') {
  broadcastProgress = global.emailProgressBroadcast;
}

export async function POST(request) {
  try {
    const { recipients, subject, message, fromEmail, fromName, delay = 500, enableProgress = false } = await request.json();

    // Create a response stream for progress updates
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
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
          const sentEmails = new Set();

          // Send emails with progress tracking
          for (let i = 0; i < recipients.length; i++) {
            const recipient = recipients[i];
            
            // Skip if email was already sent
            if (sentEmails.has(recipient.email)) {
              console.log(`Skipping duplicate email: ${recipient.email}`);
              continue;
            }
            
            try {
              const mailOptions = {
                from: `"${fromName}" <${process.env.GMAIL_USER}>`,
                to: recipient.email,
                subject: subject,
                html: message,
                replyTo: fromEmail,
                headers: {
                  'X-Priority': '3',
                  'X-Mailer': 'Bulk Email Sender'
                }
              };

              await transporter.sendMail(mailOptions);
              sentEmails.add(recipient.email);
              results.push({ 
                email: recipient.email, 
                status: 'success', 
                index: i + 1 
              });

              // Send progress update
              if (enableProgress) {
                const progressData = {
                  type: 'progress',
                  current: i + 1,
                  total: recipients.length,
                  percentage: Math.round(((i + 1) / recipients.length) * 100),
                  email: recipient.email,
                  status: 'success'
                };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(progressData)}\n\n`));
              }
            } catch (error) {
              errors.push({ 
                email: recipient.email, 
                error: error.message, 
                index: i + 1 
              });

              // Send progress update for error
              if (enableProgress) {
                const progressData = {
                  type: 'progress',
                  current: i + 1,
                  total: recipients.length,
                  percentage: Math.round(((i + 1) / recipients.length) * 100),
                  email: recipient.email,
                  status: 'error',
                  error: error.message
                };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(progressData)}\n\n`));
              }
            }

            // Add delay between emails
            if (i < recipients.length - 1) {
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }

          // Send final result
          const finalResult = {
            type: 'complete',
            success: true,
            totalRecipients: recipients.length,
            successfulSends: results.length,
            failedSends: errors.length,
            results,
            errors,
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(finalResult)}\n\n`));
          controller.close();

        } catch (error) {
          const errorResult = {
            type: 'error',
            success: false,
            error: error.message
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorResult)}\n\n`));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      }
    });

  } catch (error) {
    console.error('Gmail bulk error:', error);
    return NextResponse.json(
      { error: 'Failed to send emails' },
      { status: 500 }
    );
  }
}
