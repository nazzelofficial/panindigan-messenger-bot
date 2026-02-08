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
  private model: NSFWJS | null = null;
  private isModelLoading = false;
  private isProcessing = false; // Mutex for processing

  constructor() {
    // Model loading deferred to init() to ensure server is running
  }

  async init() {
    await this.loadModel();
  }

  private async loadModel() {
    if (this.model || this.isModelLoading) return;

    this.isModelLoading = true;
    try {
      // Load the model from local server (exposed via express static)
      // This avoids file:// protocol issues in Node.js environment
      const port = config.server.port || 5000;
      const modelUrl = `http://localhost:${port}/models/nsfwjs/model.json`;
      
      BotLogger.info(`Loading NSFW model from ${modelUrl}...`);
      this.model = await nsfwjs.load(modelUrl);
      BotLogger.success('NSFW Detection Model loaded successfully from local server');
    } catch (error) {
      BotLogger.error('Failed to load NSFW Detection Model (Local Server)', error);
      // Fallback to default if local fails
      try {
        this.model = await nsfwjs.load();
        BotLogger.success('NSFW Detection Model loaded from CDN (Fallback)');
      } catch (e) {
        BotLogger.error('Failed to load NSFW Detection Model (CDN)', e);
      }
    } finally {
      this.isModelLoading = false;
    }
  }

  async isEnabled(threadId: string): Promise<boolean> {
    const key = `${this.settingKey}_${threadId}`;
    const setting = await database.getSetting<string>(key);
    return setting === 'true';
  }

  async setEnabled(threadId: string, enabled: boolean): Promise<void> {
    const key = `${this.settingKey}_${threadId}`;
    await database.setSetting(key, String(enabled));
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

  private async decodeImageTo3D(buffer: Buffer): Promise<tf.Tensor3D> {
    const image = await Jimp.read(buffer);
    const width = image.bitmap.width;
    const height = image.bitmap.height;
    
    const p = image.bitmap.data;
    const data = new Int32Array(width * height * 3);
    
    for (let i = 0; i < width * height; i++) {
        data[i * 3] = p[i * 4];      // R
        data[i * 3 + 1] = p[i * 4 + 1];  // G
        data[i * 3 + 2] = p[i * 4 + 2];  // B
    }
    
    return tf.tensor3d(data, [height, width, 3], 'int32');
  }

  async checkContent(event: any): Promise<NsfwDetectionResult> {
    const attachments = event.attachments || [];
    if (attachments.length === 0) return { detected: false, type: 'clean', severity: 'low' };

    // Ensure model is loaded
    if (!this.model) {
      await this.loadModel();
    }
    
    // If model still failed to load, fallback to filename check only
    if (!this.model) {
      return this.checkFilenames(attachments);
    }

    for (const attachment of attachments) {
      // Check Filename first (faster)
      const filenameCheck = this.checkFilename(attachment.filename);
      if (filenameCheck.detected) return filenameCheck;

      // Image Analysis
      if (attachment.type === 'photo' || attachment.type === 'animated_image') {
        const url = attachment.previewUrl || attachment.url; // Use previewUrl if available (smaller)
        if (!url) continue;

        try {
          const imageBuffer = await this.downloadImage(url);
          if (!imageBuffer) continue;

          // Decode image
          const image = await this.decodeImageTo3D(imageBuffer);
          
          // Predict (Serialized to prevent OOM)
          while (this.isProcessing) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          this.isProcessing = true;
          let predictions;
          try {
            predictions = await this.model.classify(image);
          } finally {
            this.isProcessing = false;
            image.dispose(); // Cleanup tensor memory immediately
          }

          // Check predictions
          // Classes: Porn, Hentai, Sexy, Neutral, Drawing
          const porn = predictions.find(p => p.className === 'Porn');
          const hentai = predictions.find(p => p.className === 'Hentai');
          const sexy = predictions.find(p => p.className === 'Sexy');

          // Thresholds
          if (porn && porn.probability > 0.60) {
            return { detected: true, type: 'image', severity: 'high', confidence: porn.probability, class: 'Porn' };
          }
          if (hentai && hentai.probability > 0.60) {
            return { detected: true, type: 'image', severity: 'high', confidence: hentai.probability, class: 'Hentai' };
          }
          // Sexy is usually less severe (e.g. swimwear), maybe warn only or ignore if low confidence
          if (sexy && sexy.probability > 0.85) {
             return { detected: true, type: 'image', severity: 'low', confidence: sexy.probability, class: 'Sexy' };
          }

        } catch (err) {
          BotLogger.warn(`Failed to scan image attachment: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
      
      // Video Analysis (Thumbnail check)
      if (attachment.type === 'video') {
         // Try to scan thumbnail if available
         // Facebook often sends a thumbnail URL for videos
         // The attachment object usually has thumbnailUrl or previewUrl
         // We'll treat it like an image scan
         /* 
            Note: Sulyap-FCA/Facebook attachments for video sometimes have 'thumbnailUrl' property
         */
         const thumbnailUrl = attachment.thumbnailUrl || attachment.previewUrl;
         if (thumbnailUrl) {
            try {
              const imageBuffer = await this.downloadImage(thumbnailUrl);
              if (imageBuffer) {
                const image = await this.decodeImageTo3D(imageBuffer);
                
                // Serialized prediction
                while (this.isProcessing) {
                  await new Promise(resolve => setTimeout(resolve, 100));
                }
                this.isProcessing = true;
                let predictions;
                try {
                  predictions = await this.model.classify(image);
                } finally {
                  this.isProcessing = false;
                  image.dispose();
                }

                const porn = predictions.find(p => p.className === 'Porn');
                const hentai = predictions.find(p => p.className === 'Hentai');

                if ((porn && porn.probability > 0.60) || (hentai && hentai.probability > 0.60)) {
                  return { detected: true, type: 'video', severity: 'high', confidence: Math.max(porn?.probability || 0, hentai?.probability || 0), class: 'Video Thumbnail' };
                }
              }
            } catch (e) {}
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
    if (filename.match(/xxx|porn|nsfw|sex|nude|18\+|hentai|dick|cock|pussy|vagina/i)) {
      return { detected: true, type: 'image', severity: 'high', class: 'Filename' };
    }
    return { detected: false, type: 'clean', severity: 'low' };
  }
}

export const antiNsfw = new AntiNsfw();
