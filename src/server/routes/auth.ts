import express from 'express';
import { createServerClient } from '../../lib/supabase';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Sign up
router.post('/signup', asyncHandler(async (req, res) => {
  const { email, password, name, preferredLanguage = 'en' } = req.body;

  if (!email || !password) {
    throw createError('Email and password are required', 400);
  }

  const supabase = createServerClient();
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        preferred_language: preferredLanguage
      }
    }
  });

  if (error) {
    throw createError(error.message, 400);
  }

  res.status(201).json({
    message: 'User created successfully',
    user: data.user,
    session: data.session
  });
}));

// Sign in
router.post('/signin', asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw createError('Email and password are required', 400);
  }

  const supabase = createServerClient();
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    throw createError(error.message, 401);
  }

  res.json({
    message: 'Signed in successfully',
    user: data.user,
    session: data.session
  });
}));

// Sign out
router.post('/signout', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const supabase = createServerClient();
  
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw createError(error.message, 400);
  }

  res.json({ message: 'Signed out successfully' });
}));

// Get current user profile
router.get('/profile', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const supabase = createServerClient();
  
  const { data: profile, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', req.user!.id)
    .single();

  if (error) {
    throw createError('Profile not found', 404);
  }

  res.json({ profile });
}));

// Update user profile
router.put('/profile', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const { name, preferred_language, avatar_url } = req.body;
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('users')
    .update({
      name,
      preferred_language,
      avatar_url,
      updated_at: new Date().toISOString()
    })
    .eq('id', req.user!.id)
    .select()
    .single();

  if (error) {
    throw createError('Failed to update profile', 400);
  }

  res.json({ profile: data });
}));

// Reset password
router.post('/reset-password', asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw createError('Email is required', 400);
  }

  const supabase = createServerClient();
  
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`
  });

  if (error) {
    throw createError(error.message, 400);
  }

  res.json({ message: 'Password reset email sent' });
}));

// Update password
router.post('/update-password', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const { newPassword } = req.body;

  if (!newPassword) {
    throw createError('New password is required', 400);
  }

  const supabase = createServerClient();
  
  const { error } = await supabase.auth.updateUser({
    password: newPassword
  });

  if (error) {
    throw createError(error.message, 400);
  }

  res.json({ message: 'Password updated successfully' });
}));

export default router;