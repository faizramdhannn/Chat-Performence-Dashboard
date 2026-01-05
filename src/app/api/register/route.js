import { NextResponse } from 'next/server';
import googleSheets from '@/lib/googleSheets';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  try {
    const body = await request.json();
    const { username, password, name } = body;

    // Validate input
    if (!username || !password || !name) {
      return NextResponse.json(
        { error: 'Username, password, and name are required' },
        { status: 400 }
      );
    }

    // Check if username already exists
    const existingUser = await googleSheets.getUserByUsername(username);
    if (existingUser) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

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

    await googleSheets.createPendingRegistration(registrationData);

    return NextResponse.json({
      success: true,
      message: 'Registration submitted. Please wait for admin approval.'
    });
  } catch (error) {
    console.error('Error creating registration:', error);
    return NextResponse.json(
      { error: 'Failed to submit registration' },
      { status: 500 }
    );
  }
}