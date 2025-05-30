import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/authUtils';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

// Headers for all responses
const headers = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
  'Surrogate-Control': 'no-store',
};

// Helper function to verify authentication
async function verifyAuth() {
  const cookieStore = cookies();
  const token = (await cookieStore.get('auth_token'))?.value;
  
  if (!token) {
    return { error: 'Authentication required', status: 401 };
  }
  
  const decoded = verifyToken(token);
  if (!decoded || !decoded.userId) {
    return { error: 'Invalid authentication token', status: 401 };
  }
  
  return { userId: decoded.userId };
}

// POST: Upload a file for support chat
export async function POST(request) {
  try {
    const auth = await verifyAuth();
    if (auth.error) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status, headers }
      );
    }

    // Parse the multipart form data
    const formData = await request.formData();
    const file = formData.get('file');
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400, headers }
      );
    }

    // Check file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size exceeds 5MB limit' },
        { status: 400, headers }
      );
    }

    // Check file type (allow images, PDFs, and common document types)
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'File type not allowed' },
        { status: 400, headers }
      );
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Generate a unique filename
    const fileExtension = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExtension}`;
    const filePath = path.join(uploadsDir, fileName);

    // Convert file to buffer and save it
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(filePath, buffer);

    // Generate the public URL for the file
    const fileUrl = `/uploads/${fileName}`;

    return NextResponse.json({
      success: true,
      fileName: file.name,
      fileType: file.type,
      fileUrl: fileUrl
    }, { headers });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500, headers }
    );
  }
}
