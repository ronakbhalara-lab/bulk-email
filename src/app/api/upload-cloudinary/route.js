import { NextResponse } from 'next/server';

// Demo Cloudinary credentials for testing
const CLOUDINARY_CLOUD_NAME = 'demo';
const CLOUDINARY_API_KEY = '876284736827283';
const CLOUDINARY_API_SECRET = 'test_secret_key';

// Simple upload to a public image service for demo
export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('image');
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // For demo, we'll use a placeholder image service
    // In production, replace with actual Cloudinary upload
    const timestamp = Date.now();
    const filename = `email-${timestamp}.jpg`;
    
    // Return a working image URL for demo
    const demoImageUrl = `https://picsum.photos/600/400?random=${timestamp}`;
    
    return NextResponse.json({ 
      success: true, 
      url: demoImageUrl,
      public_id: filename
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    );
  }
}
