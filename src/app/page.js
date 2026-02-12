'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Send, Users, Settings, CheckCircle, XCircle, Loader2, Upload, Image as ImageIcon, FileText, Zap, LogOut, Eye } from 'lucide-react';
import Papa from 'papaparse';

const emailSchema = z.object({
  recipients: z.string().min(1, 'Recipients are required'),
  subject: z.string().min(1, 'Subject is required'),
  message: z.string().min(1, 'Message is required'),
  imageUrl: z.string().optional(),
  fromEmail: z.string().email('Valid from email is required').optional(),
  fromName: z.string().min(1, 'From name is required').optional(),
  mainTitle: z.string().min(1, 'Main title is required').optional(),
  subTitle: z.string().min(1, 'Sub title is required').optional(),
  companyName: z.string().min(1, 'Company name is required').optional(),
});

export default function BulkEmailSender() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Check login status on component mount
  useEffect(() => {
    const checkLoginStatus = () => {
      // Check cookies (for browser close/open)
      const cookieLoggedIn = document.cookie.includes('isLoggedIn=true');

      if (cookieLoggedIn) {
        setIsLoggedIn(true);
      } else {
        // Redirect to login if not logged in
        router.push('/login');
      }
    };

    checkLoginStatus();
  }, [router]);

  const handleLogout = () => {
    // Clear localStorage
    localStorage.removeItem('isLoggedIn');

    // Clear cookie
    document.cookie = 'isLoggedIn=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';

    // Redirect to login
    router.push('/login');
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };
  const [results, setResults] = useState(null);
  const [showSmtpSettings, setShowSmtpSettings] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [csvData, setCsvData] = useState([]);
  const [isCsvUploading, setIsCsvUploading] = useState(false);
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [emailProgress, setEmailProgress] = useState({
    current: 0,
    total: 0,
    isSending: false,
    percentage: 0
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      recipients: '',
      subject: '',
      message: '',
      imageUrl: '',
      fromEmail: 'munjanirahul98@gmail.com',
      fromName: 'Rahul Munjani',
      mainTitle: '',
      subTitle: '',
      companyName: '',
    },
  });

  const watchedRecipients = watch('recipients');
  const watchedSubject = watch('subject');
  const watchedMessage = watch('message');
  const watchedImageUrl = watch('imageUrl');
  const watchedFromEmail = watch('fromEmail');
  const watchedFromName = watch('fromName');
  const watchedMainTitle = watch('mainTitle');
  const watchedSubTitle = watch('subTitle');
  const watchedCompanyName = watch('companyName');

  const handleCsvUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    console.log('CSV file selected:', file.name);
    setIsCsvUploading(true);

    try {
      Papa.parse(file, {
        complete: (result) => {
          console.log('CSV parse result:', result);

          const emails = result.data
            .map((row, index) => {
              console.log(`Row ${index}:`, row);

              // Handle different formats
              let email = null;
              let name = null;

              // Try different column names and positions
              if (typeof row === 'string') {
                // Simple email string
                email = row.trim();
                name = email.split('@')[0];
              } else if (typeof row === 'object') {
                // Object with columns
                email = row.email || row.Email || row.EMAIL || row[0];
                name = row.name || row.Name || row.NAME || row[1] || email?.split('@')[0];
              }

              console.log(`Extracted - Email: ${email}, Name: ${name}`);
              return { email: email?.trim(), name: name?.trim() };
            })
            .filter(item => {
              const isValid = item.email && item.email.includes('@') && item.email.length > 5;
              console.log(`Filtering ${item.email}: ${isValid}`);
              return isValid;
            });

          console.log('Final emails array:', emails);
          setCsvData(emails);
          setValue('recipients', emails.map(item => item.email).join(', '));
          setIsCsvUploading(false);

          // Show success message
          if (emails.length > 0) {
            showToast(`Successfully loaded ${emails.length} emails from CSV!`, 'success');
          } else {
            showToast('No valid emails found in CSV. Please check your format.', 'error');
          }
        },
        error: (error) => {
          console.error('CSV parsing error:', error);
          showToast('Error parsing CSV file: ' + error.message, 'error');
          setIsCsvUploading(false);
        },
        header: false, // Auto-detect headers
        skipEmptyLines: true,
      });
    } catch (error) {
      console.error('CSV upload error:', error);
      showToast('Error uploading CSV: ' + error.message, 'error');
      setIsCsvUploading(false);
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    console.log('Image file selected:', file.name, file.type, file.size);

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      showToast('Image size should be less than 10MB', 'error');
      // Reset file input
      event.target.value = '';
      return;
    }

    setIsUploading(true);
    try {
      // Clear any previous blob URLs to prevent memory leaks
      if (uploadedImage) {
        if (uploadedImage.startsWith('blob:')) {
          URL.revokeObjectURL(uploadedImage);
          console.log('Previous blob URL revoked');
        }
        // Clear previous state completely
        setUploadedImage(null);
        setValue('imageUrl', '');
      }

      // Create new local URL for immediate preview
      const localUrl = URL.createObjectURL(file);
      console.log('New local URL created:', localUrl);

      // Set new image immediately
      setUploadedImage(localUrl);
      setValue('imageUrl', localUrl);

      // Force re-render to ensure new image shows
      setTimeout(() => {
        console.log('Image preview should show:', localUrl);
      }, 100);

      // Upload to image hosting service
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/upload-image-host', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        // Replace local URL with hosted URL
        URL.revokeObjectURL(localUrl); // Clean up local URL
        setUploadedImage(result.url);
        setValue('imageUrl', result.url);
        console.log('Hosted URL set:', result.url);
        showToast('Image uploaded successfully!', 'success');
      } else {
        console.log('Hosting service failed, keeping local URL');
        showToast('Image loaded locally (will work in this session)', 'warning');
      }
    } catch (error) {
      console.error('Image upload error:', error);
      showToast('Image loaded locally (will work in this session)', 'warning');
    } finally {
      setIsUploading(false);
      // Reset file input to allow re-selecting same file
      event.target.value = '';
    }
  };

  const onSubmit = async (data) => {
    console.log('Form submitted with data:', data);

    // Prevent double submission
    if (isLoading) {
      console.log('Already loading, preventing submission');
      return;
    }

    setIsLoading(true);
    setResults(null);

    try {
      // Use CSV data if available, Combine CSV emails and manual emails
      let recipientList = [];

      // Add CSV emails first
      if (csvData.length > 0) {
        recipientList = [...csvData];
      }

      // Add manual emails if any
      if (data.recipients && data.recipients.trim()) {
        const manualEmails = data.recipients
          // Split by both comma and newline, handle multiple separators
          .split(/[,\n\r]+/)
          .map(email => {
            const trimmedEmail = email.trim();
            return {
              email: trimmedEmail,
              name: trimmedEmail.split('@')[0]
            };
          })
          .filter(recipient => {
            // Validate email format
            const email = recipient.email;
            return email &&
              email.includes('@') &&
              email.length > 5 &&
              email.includes('.') &&
              !email.startsWith('@') &&
              !email.endsWith('@');
          });

        recipientList = [...recipientList, ...manualEmails];
      }

      // Initialize progress tracking
      const totalRecipients = recipientList.length;
      setEmailProgress({
        current: 0,
        total: totalRecipients,
        isSending: true,
        percentage: 0
      });
    
      const professionalMessage = generateProfessionalTemplate(
        data.message,
        data.imageUrl,
        data.fromName,
        data.mainTitle,     // use form value
        data.subTitle,      // use form value
        data.companyName   // use form value
      );

      // Fast sending with 100ms delay
      const delay = 100;

      // Send emails with progress tracking using Server-Sent Events
      const response = await fetch('/api/send-gmail-bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipients: recipientList,
          subject: data.subject,
          message: professionalMessage,
          fromEmail: data.fromEmail,
          fromName: data.fromName,
          delay: delay,
          enableProgress: true
        }),
      });

      // Handle Server-Sent Events for real-time progress
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let result = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'progress') {
                // Update progress bar
                setEmailProgress(prev => ({
                  ...prev,
                  current: data.current,
                  percentage: data.percentage
                }));
              } else if (data.type === 'complete') {
                result = data;
              } else if (data.type === 'error') {
                throw new Error(data.error);
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }
      setResults(result);

      // Show success toast if emails were sent successfully
      if (result.success && result.successfulSends > 0) {
        showToast(`Successfully sent ${result.successfulSends} out of ${result.totalRecipients} emails!`, 'success');
      } else if (result.success && result.successfulSends === 0) {
        showToast('No emails were sent. Please check your settings.', 'warning');
      }
    } catch (error) {
      setResults({
        success: false,
        error: 'Failed to send emails: ' + error.message,
      });
      showToast('Failed to send emails: ' + error.message, 'error');
    } finally {
      setIsLoading(false);
      // Reset progress after a delay
      setTimeout(() => {
        setEmailProgress({
          current: 0,
          total: 0,
          isSending: false,
          percentage: 0
        });
      }, 3000);
    }
  };

  const getRecipientCount = () => {
    if (csvData.length > 0) {
      // Count CSV emails + manual emails
      const manualEmails = watchedRecipients ? watchedRecipients.split(',').filter(email => email.trim()).length : 0;
      return csvData.length + manualEmails;
    }
    if (!watchedRecipients) return 0;
    return watchedRecipients.split(',').filter(email => email.trim()).length;
  };

  const generateProfessionalTemplate = (message, imageUrl, fromName, mainTitle = "Professional Message", subTitle = "Important Business Communication", companyName = "Your Company") => {
    const imageSection = imageUrl ? `
      <div class="image-banner" style="width: 100%; height: 300px; overflow: hidden; border-radius: 0 0 20px 20px; position: relative;">
        <img src="${imageUrl}" alt="Professional Image" style="width: 100%; height: 300px; object-fit: cover; display: block;" />
        <div style="position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(transparent, rgba(0,0,0,0.3)); height: 100px;"></div>
      </div>
    ` : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Professional Communication</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #2c3e50;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0;
            padding: 20px;
            min-height: 100vh;
          }
          
          .email-container {
            max-width: 650px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0,0,0,0.15);
            border: 1px solid rgba(255,255,255,0.2);
          }
          
          .header {
            background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
            padding: 40px 30px;
            text-align: center;
            position: relative;
            overflow: hidden;
          }
          
          .header::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px);
            background-size: 20px 20px;
            animation: float 20s linear infinite;
          }
          
          @keyframes float {
            0% { transform: translate(0, 0) rotate(0deg); }
            100% { transform: translate(50px, 50px) rotate(360deg); }
          }
          
          .header-content {
            position: relative;
            z-index: 1;
          }
          
          .header h1 {
            color: #ffffff;
            font-size: 32px;
            font-weight: 700;
            margin: 0;
            text-shadow: 0 2px 10px rgba(0,0,0,0.3);
            letter-spacing: -0.5px;
          }
          
          .header p {
            color: rgba(255,255,255,0.9);
            font-size: 18px;
            margin-top: 10px;
            font-weight: 300;
          }
          
          .content {
            padding: 50px 40px;
            background: #ffffff;
          }
          
          .message {
            font-size: 17px;
            line-height: 1.9;
            color: #374151;
            margin-bottom: 40px;
            white-space: pre-wrap;
            font-weight: 400;
          }
          
          .message p {
            margin-bottom: 20px;
          }
          
          .footer {
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            padding: 40px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
          }
          
          .signature {
            font-weight: 600;
            color: #1f2937;
            font-size: 18px;
          }
          
          .company-name {
            color: #6b7280;
            font-size: 16px;
          }
          
          .footer-divider {
            width: 60px;
            height: 3px;
            background: linear-gradient(90deg, #4f46e5, #7c3aed);
            margin: 20px auto;
            border-radius: 2px;
          }
          
          @media only screen and (max-width: 600px) {
            body {
              padding: 10px;
            }
            
            .email-container {
              margin: 0;
              border-radius: 15px;
            }
            
            .header {
              padding: 30px 20px;
            }
            
            .header h1 {
              font-size: 26px;
            }
            
            .content {
              padding: 30px 25px;
            }
            
            .message {
              font-size: 16px;
            }
            
            .footer {
              padding: 30px 25px;
            }
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <div class="">
              <h1>${mainTitle}</h1>
              <p>${subTitle}</p>
            </div>
          </div>
          
          ${imageSection}
          
          <div class="content">
            <div class="message">${message}</div>
          </div>
          
          <div class="footer">
            <div class="footer-divider"></div>
            <p class="signature">Best regards,</p>
            <p class="company-name">${companyName}</p>
            <p>You're receiving this secure email from our official platform</p>
            <p>with important updates and exclusive offers.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  // Don't render anything if not logged in (will redirect)
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 flex items-center justify-center">
        <div className="text-white text-2xl font-semibold">Loading...</div>
      </div>
    );
  }

  return (
    <div className="main-container">
      <div className="app-container">
        <div className="header">
          <div className="header-content">
            <div className="header-icon">
              <Mail className="icon-lg" />
            </div>
            <div>
              <h1 className="header-title">Professional Email Sender</h1>
              <p className="header-subtitle">Send personalized emails with advanced features</p>
            </div>
            <button
              onClick={handleLogout}
              className="logout-btn"
            >
              <LogOut className="icon-sm" />
              Logout
            </button>
          </div>
        </div>

        {/* Main Content - Two Column Layout */}
        <div className="content-layout">
          {/* Left Column - Form */}
          <div className="form-column">
            <form onSubmit={handleSubmit((data) => {
              console.log('HandleSubmit called');
              onSubmit(data);
            })} className="form-container">
              {/* CSV Upload and Speed */}
              <div className="grid-2">
                <div className="form-section csv-section">
                  <div className="section-header">
                    <h3 className="section-title">
                      <FileText className="icon" />
                      CSV Upload
                    </h3>
                    <span className="status-badge csv-badge">
                      {csvData.length} emails
                    </span>
                  </div>
                  <div className="flex gap-3">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleCsvUpload}
                      className="file-input"
                      id="csv-upload"
                    />
                    <label
                      htmlFor="csv-upload"
                      className="file-label"
                    >
                      <Upload className="icon-sm" />
                      {isCsvUploading ? 'Processing...' : 'Upload CSV'}
                    </label>
                    {csvData.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setCsvData([]);
                        }}
                        className="btn btn-red"
                      >
                        Clear CSV
                      </button>
                    )}
                  </div>
                  <p className="help-text csv-help">CSV with email, name columns</p>
                </div>

                <div className="form-section fast-mode-section">
                  <div className="section-header">
                    <h3 className="section-title">
                      <Zap className="icon" />
                      Fast Sending Mode
                    </h3>
                    <span className="status-badge fast-badge">
                      ⚡ 100ms delay
                    </span>
                  </div>
                </div>
              </div>

              <div className='grid-2'>
                {/* Recipients */}
                <div className="form-section recipients-section">
                  <div className="section-header">
                    <h3 className="section-title">
                      <Users className="icon" />
                      Additional Recipients
                    </h3>
                    <span className="status-badge recipients-badge">
                      {watchedRecipients ? watchedRecipients.split(/[,\n\r]+/).filter(email => email.trim() && email.includes('@')).length : 0} emails
                    </span>
                  </div>
                  <textarea
                    {...register('recipients')}
                    rows={8}
                    className="form-textarea recipients-input"
                    placeholder="Add additional emails: email1@example.com, email2@example.com"
                  />
                  {errors.recipients && (
                    <p className="error-message">{errors.recipients.message}</p>
                  )}
                </div>

                {/* Image Upload */}
                <div className="form-section image-section">
                  <div className="section-header">
                    <h3 className="section-title flex items-center gap-2">
                      <div className="icon">
                        <span className="text-white text-xs font-bold">📷</span>
                      </div>
                      Image Upload
                    </h3>
                  </div>
                  <div className="flex gap-3">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="file-input"
                      id="image-upload"
                    />
                    <label
                      htmlFor="image-upload"
                      className="file-label"
                    >
                      <Upload className="icon-sm" />
                      {isUploading ? 'Uploading...' : 'Choose Image'}
                    </label>
                    {uploadedImage && (
                      <button
                        type="button"
                        onClick={() => {
                          setUploadedImage(null);
                          setValue('imageUrl', '');
                        }}
                        className="btn btn-red"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  {uploadedImage && (
                    <div className="mt-3 p-4 bg-white rounded-xl border-2 border-yellow-200">
                      <img
                        src={uploadedImage}
                        alt="Preview"
                        className="image-preview"
                      />
                    </div>
                  )}
                  <p className="help-text image-help">Upload an image to include in your email</p>
                </div>
              </div>

              {/* Subject */}
              <div className="form-section subject-section">
                <h3 className="section-title">Subject Line</h3>
                <input
                  {...register('subject')}
                  className="form-input subject-input"
                  placeholder="Enter a clear, professional subject"
                />
                {errors.subject && (
                  <p class="error-message">{errors.subject.message}</p>
                )}
              </div>

              {/* Email Template Settings */}
              <div className="template-settings">
                <div className="template-settings-header">
                  <div className="icon">
                    <span className="text-white text-xs font-bold">📝</span>
                  </div>
                  Email Template Settings
                </div>
                <div className="template-grid">
                  <div className="template-field main-title-field">
                    <h3 className="section-title">Main Title</h3>
                    <input
                      {...register('mainTitle')}
                      className="form-input main-title-input"
                      placeholder="Enter main title"
                    />
                    {errors.mainTitle && (
                      <p className="error-message">{errors.mainTitle.message}</p>
                    )}
                  </div>

                  <div className="template-field sub-title-field">
                    <h3 className="section-title">
                      <div className="icon">
                        <span className="text-white text-xs font-bold">📄</span>
                      </div>
                      Sub Title
                    </h3>
                    <input
                      {...register('subTitle')}
                      className="form-input sub-title-input"
                      placeholder="Enter sub title"
                    />
                    {errors.subTitle && (
                      <p className="error-message">{errors.subTitle.message}</p>
                    )}
                  </div>

                  <div className="template-field company-field">
                    <h3 className="section-title">
                      <div className="icon">
                        <span className="text-white text-xs font-bold">🏢</span>
                      </div>
                      Company Name
                    </h3>
                    <input
                      {...register('companyName')}
                      className="form-input company-input"
                      placeholder="Enter company name"
                    />
                    {errors.companyName && (
                      <p className="error-message">{errors.companyName.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Message */}
              <div className="form-section message-section">
                <h3 className="section-title">Email Message</h3>
                <textarea
                  {...register('message')}
                  rows={8}
                  className="form-textarea message-input"
                  placeholder="Enter your email message..."
                />
                {errors.message && (
                  <p className="error-message">{errors.message.message}</p>
                )}
              </div>

              {/* Progress Bar */}
              {emailProgress.isSending && (
                <div className="mb-6 p-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-lg font-bold text-white">
                      {emailProgress.current} / {emailProgress.total} Emails Sent
                    </span>
                    <span className="text-lg font-bold text-white">
                      {emailProgress.percentage}%
                    </span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-3">
                    <div 
                      className="bg-white h-3 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${emailProgress.percentage}%` }}
                    />
                  </div>
                  <div className="flex justify-center mt-2">
                    <span className="text-xs text-white/80">
                      Please wait, emails are being sent...
                    </span>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex justify-center pt-6">
                <button
                  type="submit"
                  disabled={isLoading}
                  onClick={(e) => {
                    console.log('Button clicked!');
                    console.log('Is loading:', isLoading);
                    console.log('Form errors:', errors);
                  }}
                  className="btn btn-submit"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="icon spinner" />
                      Sending Emails...
                    </>
                  ) : (
                    <>
                      <Send className="icon" />
                      Send Bulk Emails
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Right Column - Real-time Preview */}
          <div className="preview-column">
            <div className="preview-container">
              <div className="preview-header">
                <Eye className="icon" />
                <h2 className="preview-title">Live Email Preview</h2>
              </div>

              {/* Preview Header Info */}
              <div className="preview-info">
                <p className="mb-2">
                  <strong>Subject:</strong> {watchedSubject || 'Your subject will appear here'}
                </p>
                <p>
                  <strong>From:</strong> {watchedFromName || 'Your Name'} &lt;{watchedFromEmail || 'your@email.com'}&gt;
                </p>
              </div>

              {/* Email Preview */}
              <div className="preview-frame">
                <div className="preview-content">
                  <div
                    dangerouslySetInnerHTML={{
                      __html: generateProfessionalTemplate(
                        watchedMessage || 'Your message content will appear here...\n\nStart typing in the form to see the preview update in real-time.',
                        watchedImageUrl,
                        watchedFromName,
                        watchedMainTitle || 'Main Title',
                        watchedSubTitle || 'Sub Title',
                        watchedCompanyName || 'Your Company'
                      )
                    }}
                  />
                </div>
              </div>

              {/* Preview Tips */}
              <div className="preview-tip">
                <p>
                  Tip: The preview updates automatically as you type. Fill in the form fields to see your email come to life!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* Toast Notification */}
      {/* Toast Notification */}
      {toast && (
        <div className={`toast ${toast.type === 'success' ? 'toast-success' : toast.type === 'error' ? 'toast-error' : 'toast-warning'}`}>
          <div className="flex items-center gap-2">
            {toast.type === 'success' && (
              <svg className="icon" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16 8 8 0zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 001.414 1.414l2 2a1 1 0 001.414 1.414L10 11.414l2 2a1 1 0 001.414 1.414z" clipRule="evenodd" />
              </svg>
            )}
            {toast.type === 'error' && (
              <svg className="icon" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16 8 8 0zm8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 00-1.414 1.414L10 12.414l1.293 1.293a1 1 0 001.414 1.414L11.414 10l1.293 1.293a1 1 0 001.414 1.414z" clipRule="evenodd" />
              </svg>
            )}
            {toast.type === 'warning' && (
              <svg className="icon" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493 1.646-2.98 1.743l5.58-9.92c.75 1.334.213 2.98-1.742 2.98zM11 13a1 1 0 11-2 0 1 1 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            )}
            <span className="font-medium">{toast.message}</span>
          </div>
        </div>
      )}

    </div >
  );
}
