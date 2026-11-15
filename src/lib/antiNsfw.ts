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

  // Detection-result cache: avoids re-downloading the same (often viral)
  // image across threads/groups. Entries expire after 10 minutes, capped at 128.
  private detectionCache = new Map<string, { result: NsfwDetectionResult; expires: number }>();
  private static readonly DETECTION_CACHE_TTL_MS = 10 * 60 * 1000;
  private static readonly DETECTION_CACHE_MAX = 128;

  private cacheDetection(key: string, result: NsfwDetectionResult): void {
    if (this.detectionCache.size >= AntiNsfw.DETECTION_CACHE_MAX) {
      const oldest = this.detectionCache.keys().next().value;
      if (oldest !== undefined) this.detectionCache.delete(oldest);
    }
    this.detectionCache.set(key, { result, expires: Date.now() + AntiNsfw.DETECTION_CACHE_TTL_MS });
  }

  private cachedDetection(key: string): NsfwDetectionResult | null {
    const entry = this.detectionCache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expires) {
      this.detectionCache.delete(key);
      return null;
    }
    return entry.result;
  }

  /**
   * Fetches an image for the NSFW check.
   *
   * Prefers the authenticated, browser-consistent path (the automate client's
   * session: Chrome UA, cookies, realistic headers) over bare axios, which
   * otherwise emits a trivially bot-shaped request (`axios/x.y` UA, no
   * cookies/headers) that Facebook flags as bot traffic — especially from
   * datacenter IPs (Render, etc.). Falls back to a browser-like raw request
   * only when the session path is unavailable.
   */
  private async fetchImage(
    target: { id?: string; url?: string | null },
    api?: any,
  ): Promise<Buffer | null> {
    const raw = api?.raw;
    if (raw && typeof raw.downloadAttachment === 'function' && target.id) {
      try {
        const buffer: Buffer = await raw.downloadAttachment(String(target.id));
        if (buffer && buffer.length) return buffer;
      } catch (error) {
        BotLogger.debug(
          `NSFW: session download failed for attachment ${target.id}, falling back to HTTP: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    if (!target.url) return null;

    try {
      const response = await axios.get(target.url, {
        responseType: 'arraybuffer',
        timeout: 15000,
        maxContentLength: 5 * 1024 * 1024,
        maxBodyLength: 5 * 1024 * 1024,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
          Accept: 'image/avif,image/webp,image/png,image/jpeg,image/*,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Sec-Fetch-Site': 'cross-site',
          'Sec-Fetch-Mode': 'no-cors',
          'Sec-Fetch-Dest': 'image',
        },
      });
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

  async checkImage(
    target: string | { id?: string; url?: string | null },
    api?: any,
  ): Promise<NsfwDetectionResult> {
    const normalized = typeof target === 'string' ? { url: target } : target;
    const key = normalized.id ? `id:${normalized.id}` : normalized.url ? `url:${normalized.url}` : null;

    if (key) {
      const cached = this.cachedDetection(key);
      if (cached) return cached;
    }

    const buffer = await this.fetchImage(normalized, api);
    const result = buffer
      ? await this.checkSkinTone(buffer)
      : { detected: false, type: 'clean' as const, severity: 'low' as const };

    if (key) this.cacheDetection(key, result);
    return result;
  }

  async checkVideo(url: string): Promise<NsfwDetectionResult> {
     // For videos, we can try to get a thumbnail or just skip for now
     // Since we don't have heavy ffmpeg setup guaranteed
     return { detected: false, type: 'clean', severity: 'low' };
  }

  async checkContent(event: any, api?: any): Promise<NsfwDetectionResult> {
    if (!event.attachments || !Array.isArray(event.attachments) || event.attachments.length === 0) {
      return { detected: false, type: 'clean', severity: 'low' };
    }

    for (const attachment of event.attachments) {
      const type = attachment.type;
      const url = attachment.url || attachment.previewUrl;

      if (!url && !attachment.id) continue;

      if (type === 'photo' || type === 'image' || type === 'animated_image') {
        const result = await this.checkImage({ id: attachment.id, url }, api);
        if (result.detected) return result;
      }
      // Video check omitted for now to save resources/prevent false positives without FFmpeg
    }

    return { detected: false, type: 'clean', severity: 'low' };
  }
}

export const antiNsfw = new AntiNsfw();
