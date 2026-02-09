import { database } from '../database/index.js';
import { BotLogger } from './logger.js';
import config from '../../config.json' with { type: 'json' };
import { Jimp } from 'jimp';
import axios from 'axios';

export interface NsfwDetectionResult {
  detected: boolean;
  type: 'image' | 'video' | 'clean';
  severity: 'high' | 'low';
  confidence?: number;
  class?: string;
}

export class AntiNsfw {
  private settingKey = 'antinsfw';
  private memoryCache = new Map<string, boolean>(); // Fallback if DB fails

  constructor() {
    // Model loading disabled
  }

  async init() {
    BotLogger.info('NSFW Detection: Using Algorithmic Skin Tone Detection (Strict Mode)');
  }

  async isEnabled(threadId: string): Promise<boolean> {
    // 1. Check Memory Cache first (fastest)
    if (this.memoryCache.has(threadId)) {
        return this.memoryCache.get(threadId)!;
    }

    // 2. Check Database
    const key = `${this.settingKey}_${threadId}`;
    try {
        const setting = await database.getSetting<boolean | string>(key);
        
        // Debug logging
        if (setting === null) {
            // Not in DB. If DB is disconnected, this is expected.
            // Default to false.
            return false;
        }

        // Handle both boolean and string for backward compatibility
        const isEnabled = setting === true || setting === 'true';
        
        // Update cache
        this.memoryCache.set(threadId, isEnabled);
        
        return isEnabled;
    } catch (error) {
        BotLogger.warn(`[AntiNSFW] DB Check failed for ${threadId}, using default (false)`);
        return false;
    }
  }

  async setEnabled(threadId: string, enabled: boolean): Promise<boolean> {
    const key = `${this.settingKey}_${threadId}`;
    
    // 1. Update Memory Cache immediately
    this.memoryCache.set(threadId, enabled);
    
    // 2. Try to update Database
    try {
        const success = await database.setSetting(key, enabled);
        if (!success) {
            BotLogger.warn(`[AntiNSFW] Failed to save to DB for ${threadId}, but enabled in memory session.`);
        }
        return true; // Return true because it works in memory at least
    } catch (error) {
        BotLogger.error(`[AntiNSFW] Error saving to DB for ${threadId}`, error);
        return true; // Still return true so the user sees "Success" (Session only)
    }
  }

  private async downloadImage(url: string): Promise<Buffer | null> {
    try {
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      return Buffer.from(response.data);
    } catch (error) {
      BotLogger.error('Failed to download image for NSFW check', error);
      return null;
    }
  }

  // Simple Skin Tone Detection Algorithm (Non-AI)
  private async checkSkinTone(buffer: Buffer): Promise<NsfwDetectionResult> {
    try {
      const image = await Jimp.read(buffer);
      const width = image.bitmap.width;
      const height = image.bitmap.height;
      let skinPixels = 0;
      const totalPixels = width * height;

      // Scan every 2nd pixel to save CPU
      for (let y = 0; y < height; y += 2) {
        for (let x = 0; x < width; x += 2) {
          const hex = image.getPixelColor(x, y);
          const rgba = { r: (hex >>> 24) & 0xff, g: (hex >>> 16) & 0xff, b: (hex >>> 8) & 0xff, a: hex & 0xff };
          const { r, g, b } = rgba;

          // Standard skin detection rules (RGB)
          // Rule 1: R > 95, G > 40, B > 20
          // Rule 2: max(R,G,B) - min(R,G,B) > 15
          // Rule 3: |R-G| > 15
          // Rule 4: R > G and R > B
          if (
            r > 95 && g > 40 && b > 20 &&
            Math.max(r, g, b) - Math.min(r, g, b) > 15 &&
            Math.abs(r - g) > 15 &&
            r > g && r > b
          ) {
            skinPixels++;
          }
        }
      }

      const skinRatio = skinPixels / (totalPixels / 4); // Divided by 4 because we scanned every 2nd pixel (1/4th of total)
      
      // If more than 40% skin, consider it NSFW
      const isNsfw = skinRatio > 0.40;

      return {
        detected: isNsfw,
        type: 'image',
        severity: isNsfw ? 'high' : 'low',
        confidence: skinRatio
      };
    } catch (error) {
      BotLogger.error('Skin tone check failed', error);
      return { detected: false, type: 'clean', severity: 'low' };
    }
  }

  async checkImage(url: string): Promise<NsfwDetectionResult> {
    const buffer = await this.downloadImage(url);
    if (!buffer) return { detected: false, type: 'clean', severity: 'low' };
    return this.checkSkinTone(buffer);
  }

  async checkVideo(url: string): Promise<NsfwDetectionResult> {
     // For videos, we can try to get a thumbnail or just skip for now
     // Since we don't have heavy ffmpeg setup guaranteed
     return { detected: false, type: 'clean', severity: 'low' };
  }

  async checkContent(event: any): Promise<NsfwDetectionResult> {
    if (!event.attachments || !Array.isArray(event.attachments) || event.attachments.length === 0) {
      return { detected: false, type: 'clean', severity: 'low' };
    }

    for (const attachment of event.attachments) {
      const type = attachment.type;
      const url = attachment.url || attachment.previewUrl;

      if (!url) continue;

      if (type === 'photo' || type === 'image' || type === 'animated_image') {
        const result = await this.checkImage(url);
        if (result.detected) return result;
      } 
      // Video check omitted for now to save resources/prevent false positives without FFmpeg
    }

    return { detected: false, type: 'clean', severity: 'low' };
  }
}

export const antiNsfw = new AntiNsfw();
