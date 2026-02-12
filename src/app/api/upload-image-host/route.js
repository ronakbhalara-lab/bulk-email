import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

async function uploadToCloudinary(file) {
  try {
    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Upload to Cloudinary using buffer
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { 
          resource_type: 'auto',
          folder: 'email-images',
          public_name: file.name.split('.')[0]
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(buffer);
    });
    
    return {
      success: true,
      url: result.secure_url,
      thumbnail: result.secure_url.replace('/upload/', '/upload/w_200,h_200,c_fill/'),
      display_url: result.secure_url,
      size: result.bytes,
      filename: file.name,
      type: file.type,
      provider: 'cloudinary'
    };
  } catch (error) {
    console.error('Cloudinary upload failed:', error);
    return { success: false, error: error.message };
  }
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('image');
    
    if (!file) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      );
    }

    console.log('Uploading image:', file.name, file.type, file.size);

    // Convert file to base64 for IBB API and buffer for Cloudinary
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');

    // Try ImgBB first
    if (process.env.IMGBB_API_KEY) {
      try {
        console.log('Trying ImgBB upload...');
        
        const imgbbFormData = new FormData();
        imgbbFormData.append('key', process.env.IMGBB_API_KEY);
        imgbbFormData.append('image', base64);
        imgbbFormData.append('name', file.name);
        imgbbFormData.append('expiration', '0');

        const response = await fetch('https://api.imgbb.com/1/upload', {
          method: 'POST',
          body: imgbbFormData,
        });

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const result = await response.json();
          
          if (result.success) {
            const imageUrl = result.data.url;
            const thumbnailUrl = result.data.thumb.url;
            
            console.log('IBB Upload Success:');
            console.log('- Image URL:', imageUrl);
            console.log('- Thumbnail URL:', thumbnailUrl);
            
            return NextResponse.json({
              success: true,
              url: imageUrl,
              thumbnail: thumbnailUrl,
              display_url: result.data.display_url,
              size: result.data.size,
              filename: file.name,
              type: file.type,
              provider: 'imgbb'
            });
          }
        }
        console.log('ImgBB failed, trying Cloudinary...');
      } catch (error) {
        console.log('ImgBB error, trying Cloudinary...', error.message);
      }
    } else {
      console.log('ImgBB API key not configured, using Cloudinary...');
    }

    // Fallback to Cloudinary
    console.log('Uploading to Cloudinary...');
    const cloudinaryResult = await uploadToCloudinary(file);
    
    if (cloudinaryResult.success) {
      console.log('Cloudinary Upload Success:');
      console.log('- Image URL:', cloudinaryResult.url);
      
      return NextResponse.json(cloudinaryResult);
    } else {
      return NextResponse.json(
        { error: 'Both ImgBB and Cloudinary uploads failed: ' + cloudinaryResult.error },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Image upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload image: ' + error.message },
      { status: 500 }
    );
  }
}
