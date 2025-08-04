import express from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { createServerClient } from '../../lib/supabase';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';
import { openaiService } from '../services/openai';
import path from 'path';
import fs from 'fs/promises';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
    }
  }
});

// Upload image
router.post('/image', authenticate, upload.single('image'), asyncHandler(async (req: AuthRequest, res) => {
  if (!req.file) {
    throw createError('No file uploaded', 400);
  }

  const { trip_id, description } = req.body;
  const supabase = createServerClient();

  try {
    // Process image with Sharp
    const processedImage = await sharp(req.file.buffer)
      .resize(1200, 1200, { 
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 85 })
      .toBuffer();

    // Generate filename
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2)}.jpg`;
    const filepath = `uploads/${req.user!.id}/${filename}`;

    // Upload to Supabase Storage
    const { data, error: uploadError } = await supabase.storage
      .from('images')
      .upload(filepath, processedImage, {
        contentType: 'image/jpeg',
        cacheControl: '3600'
      });

    if (uploadError) {
      throw createError('Failed to upload image', 500);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('images')
      .getPublicUrl(filepath);

    // If trip_id provided, add to trip's media
    if (trip_id) {
      // Verify trip ownership
      const { data: trip } = await supabase
        .from('trips')
        .select('id')
        .eq('id', trip_id)
        .eq('user_id', req.user!.id)
        .single();

      if (!trip) {
        throw createError('Trip not found or access denied', 404);
      }

      // Update trip metadata with new image
      const { error: updateError } = await supabase
        .from('trips')
        .update({
          metadata: {
            images: [publicUrl],
            updated_at: new Date().toISOString()
          }
        })
        .eq('id', trip_id);

      if (updateError) {
        console.error('Failed to update trip with image:', updateError);
      }
    }

    res.json({
      message: 'Image uploaded successfully',
      url: publicUrl,
      filename,
      size: processedImage.length
    });

  } catch (error) {
    console.error('Image upload error:', error);
    throw createError('Failed to process and upload image', 500);
  }
}));

// Analyze image with AI (Magic Camera feature)
router.post('/analyze', authenticate, upload.single('image'), asyncHandler(async (req: AuthRequest, res) => {
  if (!req.file) {
    throw createError('No file uploaded', 400);
  }

  const { language = 'en', analysis_type = 'general' } = req.body;

  try {
    // Convert image to base64
    const base64Image = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype;

    // Use OpenAI Vision API (GPT-4 with vision)
    const openai = new (require('openai'))({
      apiKey: process.env.OPENAI_API_KEY,
    });

    let prompt = '';
    switch (analysis_type) {
      case 'landmark':
        prompt = language === 'he' 
          ? 'זהה את ציון הדרך או המקום בתמונה. ספק מידע היסטורי ותיאור מפורט.'
          : 'Identify the landmark or location in this image. Provide historical information and detailed description.';
        break;
      case 'menu':
        prompt = language === 'he'
          ? 'תרגם את התפריט בתמונה לעברית. ספק גם המלצות על מנות פופולריות.'
          : 'Translate the menu in this image to English. Also provide recommendations for popular dishes.';
        break;
      case 'text':
        prompt = language === 'he'
          ? 'חלץ וזהה את כל הטקסט בתמונה ותרגם אותו לעברית.'
          : 'Extract and identify all text in this image and translate it to English.';
        break;
      default:
        prompt = language === 'he'
          ? 'תאר את התמונה ותן מידע שימושי לתייר על המקום או הפעילות בתמונה.'
          : 'Describe this image and provide useful travel information about the location or activity shown.';
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 1000
    });

    const analysis = response.choices[0]?.message?.content || 'Could not analyze image.';

    // Store analysis in database
    const supabase = createServerClient();
    const { error: saveError } = await supabase
      .from('messages')
      .insert({
        user_id: req.user!.id,
        role: 'assistant',
        content: analysis,
        metadata: {
          type: 'image_analysis',
          analysis_type,
          language,
          image_analyzed: true
        }
      });

    if (saveError) {
      console.error('Failed to save analysis:', saveError);
    }

    res.json({
      analysis,
      analysis_type,
      language
    });

  } catch (error) {
    console.error('Image analysis error:', error);
    throw createError('Failed to analyze image', 500);
  }
}));

// Extract text from image (OCR)
router.post('/ocr', authenticate, upload.single('image'), asyncHandler(async (req: AuthRequest, res) => {
  if (!req.file) {
    throw createError('No file uploaded', 400);
  }

  const { target_language = 'en' } = req.body;

  try {
    const base64Image = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype;

    const openai = new (require('openai'))({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            { 
              type: "text", 
              text: `Extract all text from this image and translate it to ${target_language === 'he' ? 'Hebrew' : 'English'}. Return both original and translated text in JSON format: {"original": "...", "translated": "..."}`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 1000
    });

    const result = response.choices[0]?.message?.content || '{"original": "", "translated": ""}';
    
    try {
      const parsedResult = JSON.parse(result);
      res.json({
        original_text: parsedResult.original,
        translated_text: parsedResult.translated,
        target_language
      });
    } catch (parseError) {
      // Fallback if JSON parsing fails
      res.json({
        original_text: result,
        translated_text: result,
        target_language
      });
    }

  } catch (error) {
    console.error('OCR error:', error);
    throw createError('Failed to extract text from image', 500);
  }
}));

// Get user's uploaded images
router.get('/images', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const { trip_id, limit = 20 } = req.query;
  const supabase = createServerClient();

  try {
    const { data: files, error } = await supabase.storage
      .from('images')
      .list(`uploads/${req.user!.id}`, {
        limit: Number(limit),
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (error) {
      throw createError('Failed to fetch images', 500);
    }

    const images = files?.map(file => ({
      name: file.name,
      url: supabase.storage.from('images').getPublicUrl(`uploads/${req.user!.id}/${file.name}`).data.publicUrl,
      created_at: file.created_at,
      size: file.metadata?.size
    })) || [];

    res.json({ images });

  } catch (error) {
    console.error('Error fetching images:', error);
    throw createError('Failed to fetch user images', 500);
  }
}));

// Delete uploaded image
router.delete('/images/:filename', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const { filename } = req.params;
  const supabase = createServerClient();

  try {
    const filepath = `uploads/${req.user!.id}/${filename}`;
    
    const { error } = await supabase.storage
      .from('images')
      .remove([filepath]);

    if (error) {
      throw createError('Failed to delete image', 500);
    }

    res.json({ message: 'Image deleted successfully' });

  } catch (error) {
    console.error('Error deleting image:', error);
    throw createError('Failed to delete image', 500);
  }
}));

export default router;