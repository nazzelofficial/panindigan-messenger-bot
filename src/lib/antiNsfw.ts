import { database } from '../database/index.js';
import { BotLogger } from './logger.js';
import config from '../../config.json' with { type: 'json' };
import * as tf from '@tensorflow/tfjs';
import { createRequire } from 'module';
import path from 'path';

const require = createRequire(import.meta.url);

const nsfwjs = require('nsfwjs');
import type { NSFWJS } from 'nsfwjs';
import axios from 'axios';
import { Jimp } from 'jimp';

export interface NsfwDetectionResult {
  detected: boolean;
  type: 'image' | 'video' | 'clean';
  severity: 'high' | 'low';
  confidence?: number;
  class?: string;
}

export class AntiNsfw {
  private settingKey = 'antinsfw';
  // private model: NSFWJS | null = null; // Disabled per user request (Wag AI)
  // private isModelLoading = false;
  // private isProcessing = false; // Mutex for processing

  constructor() {
    // Model loading disabled
  }

  async init() {
    // await this.loadModel(); // Disabled
    BotLogger.info('NSFW Detection: Using Algorithmic Skin Tone Detection (Strict Mode)');
  }

  // private async loadModel() { ... } // Removed

  async isEnabled(threadId: string): Promise<boolean> {
    const key = `${this.settingKey}_${threadId}`;
    const setting = await database.getSetting<boolean | string>(key);
    
    // Debug logging
    if (setting === null) {
        BotLogger.info(`[AntiNSFW] Status check for ${threadId}: NULL (Disabled)`);
    } else {
        BotLogger.info(`[AntiNSFW] Status check for ${threadId}: ${setting} (${typeof setting})`);
    }

    // Handle both boolean and string for backward compatibility
    return setting === true || setting === 'true';
  }

  async setEnabled(threadId: string, enabled: boolean): Promise<boolean> {
    const key = `${this.settingKey}_${threadId}`;
    return await database.setSetting(key, enabled);
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

      // Calculate percentage (multiply by 4 because we skipped pixels)
      const percentage = (skinPixels * 4 / totalPixels) * 100;
      
      // Strict Threshold: If > 30% skin, flag it
      if (percentage > 30) {
        return { 
          detected: true, 
          type: 'image', 
          severity: 'high', 
          class: `High Skin Content (${percentage.toFixed(1)}%)`,
          confidence: percentage / 100
        };
      }
      
      return { detected: false, type: 'clean', severity: 'low' };

    } catch (e) {
      return { detected: false, type: 'clean', severity: 'low' };
    }
  }

  async checkContent(event: any): Promise<NsfwDetectionResult> {
    const attachments = event.attachments || [];
    if (attachments.length === 0) return { detected: false, type: 'clean', severity: 'low' };

    for (const attachment of attachments) {
      // Check Filename first
      const filenameCheck = this.checkFilename(attachment.filename);
      if (filenameCheck.detected) return filenameCheck;

      // Image Analysis (Skin Tone)
      if (attachment.type === 'photo' || attachment.type === 'animated_image' || attachment.type === 'video') {
        // Use preview/thumbnail if available
        const url = attachment.previewUrl || attachment.thumbnailUrl || attachment.url;
        if (!url) continue;

        try {
          const imageBuffer = await this.downloadImage(url);
          if (imageBuffer) {
             const skinCheck = await this.checkSkinTone(imageBuffer);
             if (skinCheck.detected) return skinCheck;
          }
        } catch (err) {
          BotLogger.warn(`Failed to scan image attachment: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }

    return { detected: false, type: 'clean', severity: 'low' };
  }

  private checkFilenames(attachments: any[]): NsfwDetectionResult {
    for (const attachment of attachments) {
       const res = this.checkFilename(attachment.filename);
       if (res.detected) return res;
    }
    return { detected: false, type: 'clean', severity: 'low' };
  }

  private checkFilename(filename: string | undefined): NsfwDetectionResult {
    if (!filename) return { detected: false, type: 'clean', severity: 'low' };
    
    // Enhanced regex with Tagalog/Filipino NSFW terms
    const nsfwRegex = /xxx|porn|nsfw|sex|nude|18\+|hentai|dick|cock|pussy|vagina|bastos|libog|kantot|pekpek|tite|boobs|dede|bold|scandal|iyot/i;
    
    if (filename.match(nsfwRegex)) {
      return { detected: true, type: 'image', severity: 'high', class: 'Filename' };
    }
    return { detected: false, type: 'clean', severity: 'low' };
  }
}

export const antiNsfw = new AntiNsfw();
