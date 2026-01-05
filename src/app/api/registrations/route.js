import { NextResponse } from 'next/server';
import googleSheets from '@/lib/googleSheets';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  console.log('📝 Registration request received');
  
  try {
    const body = await request.json();
    const { username, password, name } = body;

    console.log('📝 Registration data:', { username, name });

    // Validate input
    if (!username || !password || !name) {
      console.log('❌ Validation failed: missing fields');
      return NextResponse.json(
        { error: 'Username, password, and name are required' },
        { status: 400 }
      );
    }

    // Check if username already exists
    console.log('🔍 Checking if username exists...');
    const existingUser = await googleSheets.getUserByUsername(username);
    if (existingUser) {
      console.log('❌ Username already exists:', username);
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 400 }
      );
    }

    // Hash password
    console.log('🔐 Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('✅ Password hashed, length:', hashedPassword.length);

    // Create pending registration
    const registrationData = {
      id: Date.now().toString(),
      username,
      password: hashedPassword,
      name,
      status: 'pending',
      requestedAt: new Date().toISOString(),
      role: '', // Will be set by admin
    };

    console.log('💾 Creating pending registration...');
    await googleSheets.createPendingRegistration(registrationData);
    console.log('✅ Registration created successfully');

    return NextResponse.json({
      success: true,
      message: 'Registration submitted. Please wait for admin approval.'
    });
  } catch (error) {
    console.error('💥 Registration error:', error);
    console.error('Error stack:', error.stack);
    
    // More detailed error message
    let errorMessage = 'Failed to submit registration';
    if (error.message) {
      errorMessage += ': ' + error.message;
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}