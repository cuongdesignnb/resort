'use server';

import prisma from '@/lib/db';
import { hashPassword, encryptSession } from '@/lib/auth';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export interface ActionResponse {
  error?: string;
  success?: boolean;
}

export async function loginAction(prevState: ActionResponse | null, formData: FormData): Promise<ActionResponse> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Vui lòng điền đầy đủ email và mật khẩu.' };
  }

  try {
    // 1. Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user || !user.passwordHash) {
      return { error: 'Tài khoản hoặc mật khẩu không đúng.' };
    }

    // 2. Hash and compare password
    const hashedInput = hashPassword(password);
    if (hashedInput !== user.passwordHash) {
      return { error: 'Tài khoản hoặc mật khẩu không đúng.' };
    }

    // 3. Encrypt session payload
    const sessionData = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
    const encryptedToken = encryptSession(sessionData);

    // 4. Save to secure cookie
    const cookieStore = await cookies();
    cookieStore.set('auth_session', encryptedToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

  } catch (error: any) {
    console.error('Login action error:', error);
    return { error: 'Lỗi hệ thống: ' + (error.message || 'Không rõ nguyên nhân') };
  }

  // Redirect to dashboard on success
  redirect('/');
}
