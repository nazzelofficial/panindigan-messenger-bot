import 'dotenv/config';
import fs from 'fs';
import { login } from 'panindigan-automate';
import type { MessengerClient, ParticipantJoinEvent, ParticipantLeaveEvent } from 'panindigan-automate';
import { BotLogger } from './lib/logger.js';
import { commandHandler } from './lib/commandHandler.js';
import { database, initDatabase } from './database/index.js';
import { redis } from './lib/redis.js';
import { antiSpam } from './lib/antiSpam.js';
import { createServer, startServer } from './services/server.js';
import { eventHandler } from './lib/eventHandler.js';
import { maintenance } from './lib/maintenance.js';
import { badWordsFilter } from './lib/badwords.js';
import { antiNsfw } from './lib/antiNsfw.js';
import { isOwner, canAccessLockedGroup } from './lib/permissions.js';
import config from '../config.json' with { type: 'json' };
import type { CommandContext, MessageOptions } from './types/index.js';

const APPSTATE_FILE = './appstate.json';
const prefix = config.bot.prefix;

const recentEvents = new Map<string, number>();
const EVENT_DEBOUNCE_MS = 30000;

// Message deduplication to prevent duplicate processing (Messenger may emit the same message twice)
const processedMessages = new Map<string, number>();
const MESSAGE_DEBOUNCE_MS = 5000;
let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 30000;

function isMessageDuplicate(messageId: string): boolean {
  if (!messageId) return false;
  
  const now = Date.now();
  const lastTime = processedMessages.get(messageId);
  
  if (lastTime && (now - lastTime) < MESSAGE_DEBOUNCE_MS) {
    return true;
  }
  
  processedMessages.set(messageId, now);
  
  // Cleanup only every 30 seconds to avoid O(n) on every message
  if (now - lastCleanup > CLEANUP_INTERVAL) {
    lastCleanup = now;
    for (const [key, time] of processedMessages.entries()) {
      if (now - time > MESSAGE_DEBOUNCE_MS * 2) {
        processedMessages.delete(key);
      }
    }
    // Hard limit on size
    if (processedMessages.size > 500) {
      const keysToDelete = Array.from(processedMessages.keys()).slice(0, 200);
      keysToDelete.forEach(key => processedMessages.delete(key));
    }
  }
  
  return false;
}

function isEventDuplicate(eventKey: string): boolean {
  const now = Date.now();
  const lastTime = recentEvents.get(eventKey);
  
  if (lastTime && (now - lastTime) < EVENT_DEBOUNCE_MS) {
    return true;
  }
  
  recentEvents.set(eventKey, now);
  
  for (const [key, time] of recentEvents.entries()) {
    if (now - time > EVENT_DEBOUNCE_MS * 2) {
      recentEvents.delete(key);
    }
  }
  
  if (recentEvents.size > 500) {
    const keysToDelete = Array.from(recentEvents.keys()).slice(0, 100);
    keysToDelete.forEach(key => recentEvents.delete(key));
  }
  
  return false;
}

async function main(): Promise<void> {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════════╗
║                                                                                   ║
║  ██████╗  █████╗ ███╗   ██╗██╗███╗   ██╗██████╗ ██╗ ██████╗  █████╗ ███╗   ██╗  ║
║  ██╔══██╗██╔══██╗████╗  ██║██║████╗  ██║██╔══██╗██║██╔════╝ ██╔══██╗████╗  ██║  ║
║  ██████╔╝███████║██╔██╗ ██║██║██╔██╗ ██║██║  ██║██║██║  ███╗███████║██╔██╗ ██║  ║
║  ██╔═══╝ ██╔══██║██║╚██╗██║██║██║╚██╗██║██║  ██║██║██║   ██║██╔══██║██║╚██╗██║  ║
║  ██║     ██║  ██║██║ ╚████║██║██║ ╚████║██████╔╝██║╚██████╔╝██║  ██║██║ ╚████║  ║
║  ╚═╝     ╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝╚═╝  ╚═══╝╚═════╝ ╚═╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═══╝  ║
║                                                                                   ║
║             Advanced Facebook Messenger User-Bot | TypeScript Edition             ║
║                                                                                   ║
╚═══════════════════════════════════════════════════════════════════════════════════╝
`);
  
  BotLogger.startup(`Starting ${config.bot.name} v${config.bot.version}`);
  
  console.log('═════════════════════ INITIALIZING SYSTEMS ═════════════════════');
  
  const dbInitialized = await initDatabase();
  
  if (!dbInitialized) {
    BotLogger.warn('PostgreSQL not connected. Database features will be disabled.');
    BotLogger.info('Set DATABASE_URL environment variable to enable database.');
  } else {
    console.log('  [DATABASE]        PostgreSQL connected successfully');
    
    // Check for shutdown flag - prevents auto-restart after shutdown command
    // Only runs if FORCE_START env is not set (for redeployment)
    if (process.env.FORCE_START !== 'true') {
      try {
        const isShutdown = await database.getSetting<boolean>('bot_shutdown');
        if (isShutdown === true) {
          const shutdownTime = await database.getSetting<string>('bot_shutdown_time') || 'Unknown';
          console.log('');
          console.log('═══════════════════════ SHUTDOWN FLAG DETECTED ═══════════════════');
          console.log('  [STATUS]          Bot was shutdown via command');
          console.log(`  [TIME]            ${shutdownTime}`);
          console.log('  [ACTION]          Refusing to start');
          console.log('');
          console.log('  To restart the bot:');
          console.log('    1. Redeploy on your hosting platform (Koyeb, Railway, etc.)');
          console.log('    2. Or set FORCE_START=true in environment variables');
          console.log('═════════════════════════════════════════════════════════════════');
          console.log('');
          
          // Keep process alive but do nothing - prevents restart loops
          // Hosting will see process is running but bot is not active
          await new Promise(() => {});
        }
      } catch (e) {
        // No shutdown flag set, continue normally
      }
    } else {
      // FORCE_START is set, clear the shutdown flag
      console.log('  [FORCE_START]     Clearing shutdown flag (FORCE_START=true)');
      try {
        await database.setSetting('bot_shutdown', false);
      } catch (e) {
        // Ignore
      }
    }
  }
  
  await redis.connect();
  if (redis.connected) {
    console.log('  [CACHE]           Redis connected successfully');
  }
  
  console.log('═══════════════════════ LOADING MODULES ════════════════════════');
  
  await commandHandler.loadCommands();
  const commandCount = commandHandler.getAllCommands().size;
  const categories = commandHandler.getCategories();
  
  console.log(`  [COMMANDS]        Loaded ${commandCount} commands in ${categories.length} categories`);
  for (const category of categories) {
    const count = commandHandler.getCommandsByCategory(category).length;
    console.log(`                    - ${category}: ${count} commands`);
  }
  
  console.log('  [MODERATION]      Bad words filter loaded');
  console.log('  [MAINTENANCE]     Maintenance system ready');
  console.log('  [EVENTS]          Event handlers initialized');
  
  console.log('═════════════════════ STARTING SERVICES ═════════════════════════');
  
  const app = createServer();
  startServer(app);
  console.log(`  [SERVER]          Express running on port ${config.server.port}`);
  console.log(`  [DASHBOARD]       http://0.0.0.0:${config.server.port}`);
  
  // Initialize Anti-NSFW model after server is running
  await antiNsfw.init();
  
  let appState: any = null;
  let appStateSource: 'env' | 'file' | '' = '';
  
  // Check for APPSTATE environment variable (PaaS support)
  // This takes precedence over appstate.json file
  if (process.env.APPSTATE) {
    try {
      console.log('  [APPSTATE]        Found APPSTATE environment variable');
      const envAppState = process.env.APPSTATE.trim();
      
      const parsed = JSON.parse(envAppState);
      if (Array.isArray(parsed)) {
        appState = parsed;
      } else if (parsed.cookies && Array.isArray(parsed.cookies)) {
        appState = parsed.cookies;
      } else {
        appState = parsed;
      }
      appStateSource = 'env';
      console.log('  [APPSTATE]        Loaded from APPSTATE env');
    } catch (error) {
      console.log('  [APPSTATE]        Error parsing APPSTATE env var', error);
    }
  }

  // Fallback to appstate.json only if ENV is not set (development support)
  if (!appState && fs.existsSync(APPSTATE_FILE)) {
    try {
      const fileContent = fs.readFileSync(APPSTATE_FILE, 'utf8');
      if (fileContent && fileContent.trim().length > 2) {
        const parsed = JSON.parse(fileContent);
        if (Array.isArray(parsed)) {
          appState = parsed;
        } else if (parsed.cookies && Array.isArray(parsed.cookies)) {
          appState = parsed.cookies;
        } else {
          appState = parsed;
        }
        appStateSource = 'file';
        console.log('  [APPSTATE]        Loaded from file');
      } else {
        console.log('  [APPSTATE]        File exists but is empty');
      }
    } catch (error) {
      console.log('  [APPSTATE]        Error loading from file');
    }
  } else if (!appState) {
    console.log('  [APPSTATE]        Not found in environment or file');
  }
  
  if (!appState || !Array.isArray(appState) || appState.length === 0) {
    console.log('═══════════════════════ WARNING ════════════════════════════════');
    console.log('  No valid appstate found.');
    console.log('  Please provide a valid appstate.json file with Facebook cookies.');
    console.log('  The Express server is running. Bot will not connect to Messenger.');
    console.log('═════════════════════════════════════════════════════════════════');
    return;
  }
  
  console.log('════════════════════ CONNECTING TO FACEBOOK ═════════════════════');
  console.log('  [LOGIN]           Attempting Facebook login...');

  try {
    // Login: resolves with the connected, typed MessengerClient.
    const client = await login(appState);

    // Register event listeners AFTER login: panindigan-automate's realtime
    // connection is up once login() resolves, and listeners attached here
    // still receive all subsequent events.
    let currentUserId = client.getSession().userId;

    // Message event handler
    client.on('message', async (event) => {
      try {
        await handleEvent(client, event, currentUserId || undefined);
      } catch (error) {
        BotLogger.error('Event handling error', error);
        await database.logEntry({
          type: 'error',
          level: 'error',
          message: `Event handling error: ${error instanceof Error ? error.message : 'Unknown'}`,
          metadata: { error: String(error) },
        });
      }
    });

    // Quoted-reply messages arrive as a dedicated event in panindigan-automate.
    client.on('message_reply', async (event) => {
      try {
        await handleEvent(client, event, currentUserId || undefined);
      } catch (err) {
        BotLogger.error('Reply event handling error', err);
        await database.logEntry({
          type: 'error',
          level: 'error',
          message: `Reply event handling error: ${err instanceof Error ? err.message : 'Unknown'}`,
          metadata: { error: String(err) },
        });
      }
    });

    // Group join/leave events (modern panindigan-automate payloads)
    client.on('participant_join', async (event) => {
      try {
        await handleGroupEvent(client, event);
      } catch (error) {
        BotLogger.error('Group join event handling error', error);
      }
    });
    client.on('participant_leave', async (event) => {
      try {
        await handleGroupEvent(client, event);
      } catch (error) {
        BotLogger.error('Group leave event handling error', error);
      }
    });

    // Background connection issues surface as events, not rejected promises.
    client.on('error', (event) => {
      BotLogger.error('panindigan-automate client error', event?.error ?? event);
    });
    client.on('warning', (event) => {
      BotLogger.warn(`panindigan-automate warning: ${event?.message ?? event}`);
    });
    client.on('disconnect', (event) => {
      BotLogger.error(`panindigan-automate realtime connection lost: ${event?.reason ?? 'unknown'} (attempts: ${event?.attempts ?? '?'})`);
    });
    client.on('reconnect', (event) => {
      BotLogger.info(`panindigan-automate reconnected (attempt ${event?.attempt ?? '?'}, drained ${event?.drained ?? 0} queued packets)`);
    });

    // Login is already complete (login() resolved with the connected client).
    currentUserId = client.getSession().userId;

    // Sync the appstate to the database only after a successful login,
    // connected to the actual persistence result of the session.
    const synced = await database.saveAppstate(appState);
    if (!synced) {
      console.log('  [APPSTATE]        Not synced to database (DB unavailable or save failed)');
    }

    const self = await client.getMe();
    const botName = self.name ?? 'Unknown';

    console.log('═════════════════════ LOGIN SUCCESSFUL ═════════════════════════');
    console.log(`  [ACCOUNT]         ${botName}`);
    console.log(`  [USER ID]         ${currentUserId}`);
    
    console.log('══════════════════════ BOT INFORMATION ═════════════════════════');
    console.log(`  [NAME]            ${config.bot.name}`);
    console.log(`  [VERSION]         ${config.bot.version}`);
    console.log(`  [PREFIX]          ${prefix}`);
    console.log(`  [COMMANDS]        ${commandCount} commands loaded`);
    console.log(`  [NODE]            ${process.version}`);
    
    console.log('═══════════════════════ BOT STARTED ════════════════════════════');
    console.log('  [STATUS]          Bot is now online and listening for messages');
    console.log('  [FEATURES]        Welcome/Leave messages enabled');
    console.log('  [FEATURES]        Bad words filter ready');
    console.log('  [FEATURES]        Maintenance mode available');
    console.log('═════════════════════════════════════════════════════════════════');

    BotLogger.info('Message listener started successfully');

  } catch (err: any) {
      BotLogger.error('Login failed', err);
      console.log('  [LOGIN]           Login failed. Please check your appstate.');
      return;
  }
}

function normalizeId(id: any): string {
  if (id === null || id === undefined) return '';
  return ('' + id).trim();
}

async function enrichReply(client: MessengerClient, event: any): Promise<void> {
  const repliedId = event.repliedToMessageId;
  if (!repliedId) return;
  try {
    const result = await client.getMessages(event.threadId, { limit: 20 });
    const match = result.messages.find((m: any) => m?.id === repliedId);
    event.messageReply = match
      ? {
          messageId: match.id,
          senderId: match.senderId,
          body: match.body ?? null,
          attachments: match.attachments ?? [],
          timestamp: match.timestamp,
        }
      : { messageId: repliedId };
  } catch {
    event.messageReply = { messageID: repliedId };
  }
}

async function handleEvent(client: MessengerClient, event: any, currentUserId?: string): Promise<void> {
  if (event.type === 'message_reply') {
    await enrichReply(client, event);
  }

  if (event.threadId) event.threadId = normalizeId(event.threadId);
  if (event.senderId) event.senderId = normalizeId(event.senderId);
  if (event.userId) event.userId = normalizeId(event.userId);
  if (event.messageId) event.messageId = normalizeId(event.messageId);
  if (event.messageReply?.senderId) event.messageReply.senderId = normalizeId(event.messageReply.senderId);
  if (event.messageReply?.messageId) event.messageReply.messageId = normalizeId(event.messageReply.messageId);
  if (event.participantIds && Array.isArray(event.participantIds)) {
    event.participantIds = event.participantIds.map((id: any) => normalizeId(id));
  }

  
  // Set isGroup property
  if (event.threadId) {
    event.isGroup = event.isGroup ?? (event.threadId !== event.senderId);
  }
  
  switch (event.type) {
    case 'message':
    case 'message_reply':
      await handleMessage(client, event, currentUserId);
      break;
      
    case 'event':
      await handleGroupEvent(client, event);
      break;
      
    case 'message_reaction':
      break;
      
    case 'typ':
    case 'read_receipt':
      break;
      
    default:
      break;
  }
}

async function handleMessage(client: MessengerClient, event: any, currentUserId?: string): Promise<void> {
  const body = event.body || '';
  const threadId = String(event.threadId);
  const senderId = String(event.senderId);
  const messageId = String(event.messageId || '');
  const userId = currentUserId || client.getSession().userId;
  
  const hasAttachments = event.attachments && event.attachments.length > 0;
  if (!body.trim() && !hasAttachments) return;
  
  // Check for duplicate message (Messenger may emit the same message twice as message + message_reply)
  if (messageId && isMessageDuplicate(messageId)) {
    BotLogger.debug(`Duplicate message ignored: ${messageId}`);
    return;
  }

  // Ensure thread exists in database
  const threadResult = await database.getOrCreateThread(threadId, event.isGroup ? event.name : undefined, event.isGroup);
  if (!threadResult) {
     BotLogger.warn(`Thread persistence failed for ${threadId}. Database might be disconnected.`);
  }
  
  const isSelfMessage = senderId === userId;
  const thread = await database.getThread(threadId);
  const customPrefix = thread?.prefix || prefix;
  
  // Check if group is locked FIRST - before any other processing
  if (!isSelfMessage) {
    const lockKey = `locked_${threadId}`;
    const isLocked = await database.getSetting(lockKey);
    
    if (isLocked === 'true') {
      const canAccess = await canAccessLockedGroup(senderId, client, threadId);
      if (!canAccess) {
        return;
      }
    }
  }
  
  // Log message after lock check
  await database.logEntry({
    type: 'message',
    level: 'info',
    message: body.substring(0, 200),
    threadId,
    userId: senderId,
    metadata: { hasAttachments },
  });
  
  // Anti-NSFW check (only for non-self messages)
  if (!isSelfMessage && hasAttachments) {
    const isNsfwEnabled = await antiNsfw.isEnabled(threadId);
    if (isNsfwEnabled) {
      const nsfwCheck = await antiNsfw.checkContent(event, client);
      if (nsfwCheck.detected) {
        try {
          // Attempt to unsend the message immediately
          if (messageId) {
             await client.unsendMessage(messageId);
             BotLogger.info(`NSFW Auto-Mod: Unsent message ${messageId} in ${threadId}`);
          }

          await client.sendMessage(threadId, { type: 'text', body: `⚠️ Restricted content detected. This message has been automatically removed.`
           });
        } catch (e) {
          BotLogger.error('Failed to unsend NSFW message', e);
          try {
             // Fallback notification if unsend fails (likely due to permissions)
             await client.sendMessage(threadId, { type: 'text', body: `⚠️ Restricted content detected.\n\n❌ I could not unsend the message. Please ensure I am a Group Admin.`
              });
          } catch(err) {}
        }
        
        await database.logEntry({
          type: 'moderation',
          level: 'warn',
          message: `NSFW content detected: ${nsfwCheck.type}`,
          threadId,
          userId: senderId,
          metadata: { severity: nsfwCheck.severity },
        });
        
        return; // Stop processing
      }
    }
  }
  
  // Bad words filter (only for non-self messages)
  if (!isSelfMessage) {
    const detection = await badWordsFilter.detectBadContent(body, threadId);
    if (detection.detected) {
      const settings = await badWordsFilter.getSettings(threadId);
      const warnings = await badWordsFilter.addUserWarning(senderId, threadId);
      
      // Always try to unsend/delete the message if it's a bad word and filter is enabled
      // This enforces the "block" behavior
      if (messageId) {
        try {
          await client.unsendMessage(messageId);
        } catch (e) {
          BotLogger.warn(`Failed to unsend bad word message in ${threadId}`);
        }
      }

      if (settings.action === 'warn' && detection.message) {
        try {
          await client.sendMessage(threadId, { type: 'text', body: `${detection.message}\n\nWarning ${warnings}/3 - Further violations may result in action.`
           });
        } catch (e) {}
      }
      
      await database.logEntry({
        type: 'moderation',
        level: 'warn',
        message: `Bad content detected: ${detection.type}`,
        threadId,
        userId: senderId,
        metadata: { matches: detection.matches, severity: detection.severity },
      });
    }
  }
  
  if (config.features.xp.enabled && !isSelfMessage) {
    await handleXP(client, senderId, threadId);
  }
  
  if (body.startsWith(customPrefix)) {
    const maintenanceData = await maintenance.getMaintenanceData();
    
    if (maintenanceData?.enabled && !isOwner(senderId)) {
      const hasNotified = maintenanceData.notifiedGroups.includes(threadId);
      if (!hasNotified) {
        try {
          await client.sendMessage(threadId, { type: 'text', body: maintenance.generateMaintenanceMessage(maintenanceData)
           });
          await maintenance.addNotifiedGroup(threadId);
        } catch (e) {}
      }
      return;
    }
    
    const raw = body.slice(customPrefix.length).trim();
    const parts = raw.split(/\s+/);
    const commandName = parts.shift()?.toLowerCase() || '';
    const args = parts;
    
    if (commandName) {
      const commands = commandHandler.getAllCommands();
      
      const sendMessage = async (message: string | MessageOptions, tid?: string): Promise<void> => {
        const targetThread = normalizeId(tid || threadId);
        
        const content = typeof message === 'string'
          ? { type: 'text' as const, body: message }
          : message && typeof message === 'object'
            ? { type: 'text' as const, ...message, body: String((message as any).body ?? '') }
            : { type: 'text' as const, body: String(message ?? '') };
        try {
          const messageInfo = await client.sendMessage(targetThread, content);
          
          if (messageInfo?.messageId) {
            const botMessagesKey = `bot_messages_${targetThread}`;
            const storedMessages = await database.getSetting<string[]>(botMessagesKey) || [];
            storedMessages.push(messageInfo.messageId);
            if (storedMessages.length > 100) {
              storedMessages.splice(0, storedMessages.length - 100);
            }
            await database.setSetting(botMessagesKey, storedMessages);
          }
        } catch (e) {
          BotLogger.error(`Failed to send message: ${(e as Error).message}`);
        }
      };
      
      const reply = async (message: string | MessageOptions): Promise<void> => {
        return sendMessage(message, threadId);
      };
      
      const context: CommandContext = {
        api: client,
        event,
        args,
        prefix: customPrefix,
        commands,
        config: config as any,
        sendMessage,
        reply,
      };
      
      try {
        await commandHandler.executeCommand(context, commandName);
      } catch (error) {
        BotLogger.error(`Command execution failed: ${commandName}`, error);
        try {
          await reply(`An error occurred while executing the command. Please try again.`);
        } catch (replyError) {}
      }
    }
  }
}

async function handleXP(client: MessengerClient, senderId: string, threadId: string): Promise<void> {
  const senderIdStr = normalizeId(senderId);
  const threadIdStr = normalizeId(threadId);
  
  const xpCheck = await antiSpam.checkXpCooldown(senderIdStr, config.features.xp.cooldown);
  
  if (xpCheck.onCooldown) return;
  
  const xpGain = Math.floor(
    Math.random() * (config.features.xp.maxGain - config.features.xp.minGain + 1)
  ) + config.features.xp.minGain;
  
  const result = await database.updateUserXP(senderIdStr, xpGain);
  
  if (result?.leveledUp) {
    try {
      const userInfo = await client.getUser(senderIdStr);
      const userName = userInfo.name || 'User';
      
      const levelUpMessage = `🎉 LEVEL UP!
━━━━━━━━━━━━━━━
👤 ${userName}
🏆 Level ${result.user.level}
━━━━━━━━━━━━━━━`;
      
      try {
        await client.sendMessage(threadIdStr, { type: 'text', body: levelUpMessage });
      } catch (err) {}
    } catch (error) {}
  }
}

async function handleGroupEvent(
  client: MessengerClient,
  event: ParticipantJoinEvent | ParticipantLeaveEvent
): Promise<void> {
  const threadId = event.threadId;
  const threadIdStr = normalizeId(threadId);

  if (event.type === 'participant_join' && config.features.welcome.enabled) {
    for (const addedUser of event.addedIds) {
      const userId = normalizeId(addedUser);
      let userName = 'Member';
      try {
        const info = await client.getUser(userId);
        userName = info.name ?? 'Member';
      } catch {
        // fall back to 'Member'
      }

      const eventKey = `welcome_${threadIdStr}_${userId}`;
      if (isEventDuplicate(eventKey)) {
        BotLogger.debug(`Duplicate welcome event ignored for ${userName} in ${threadIdStr}`);
        continue;
      }

      try {
        const welcomeMessage = await eventHandler.generateProfessionalWelcome(
          client,
          threadIdStr,
          userId,
          userName
        );

        await client.sendMessage(threadIdStr, { type: 'text', body: welcomeMessage });

        await database.logEntry({
          type: 'event',
          level: 'info',
          message: `Welcome sent to ${userName}`,
          threadId: threadIdStr,
          userId,
        });
      } catch (error) {
        BotLogger.error('Failed to send welcome message', error);
      }
    }
  }

  if (event.type === 'participant_leave') {
    for (const removedUser of event.removedIds) {
      const leftUser = normalizeId(removedUser);

      const leaveEventKey = `leave_${threadIdStr}_${leftUser}`;
      if (isEventDuplicate(leaveEventKey)) {
        BotLogger.debug(`Duplicate leave event ignored for ${leftUser} in ${threadIdStr}`);
        continue;
      }

      if (config.features.autoLeave.logEnabled) {
        try {
          let userName = 'Member';
          try {
            const userInfo = await client.getUser(leftUser);
            userName = userInfo.name ?? 'Member';
          } catch (e) {}

          const leaveMessage = await eventHandler.generateProfessionalLeave(
            client,
            threadIdStr,
            leftUser,
            userName
          );

          await client.sendMessage(threadIdStr, { type: 'text', body: leaveMessage });

          await database.logEntry({
            type: 'event',
            level: 'info',
            message: `User ${userName} left the group`,
            threadId: threadIdStr,
            userId: leftUser,
          });
        } catch (error) {
          BotLogger.error('Failed to send leave message', error);
        }
      }

      const antiLeaveEnabled = await database.getSetting<boolean>(`antileave_${threadIdStr}`);
      if (antiLeaveEnabled && leftUser) {
        BotLogger.info(`Anti-leave triggered: Adding ${leftUser} back to ${threadIdStr}`);
        try {
          await client.addParticipant(threadIdStr, leftUser);

          const userInfo = await client.getUser(leftUser);
          const userName = userInfo.name ?? 'Member';

          await client.sendMessage(threadIdStr, {
            type: 'text',
            body: `🔄 ANTI-LEAVE
━━━━━━━━━━━━━━━
✅ ${userName} added back
━━━━━━━━━━━━━━━`,
          });

          await database.logEntry({
            type: 'event',
            level: 'info',
            message: `Anti-leave: Added ${userName} back to group`,
            threadId: threadIdStr,
            userId: leftUser,
          });
        } catch (error) {
          BotLogger.error(`Failed to add ${leftUser} back to group`, error);
        }
      }
    }
  }
}

process.on('uncaughtException', (error) => {
  BotLogger.error('Uncaught exception', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  BotLogger.error('Unhandled rejection', reason);
});

process.on('SIGINT', async () => {
  console.log('\n═══════════════════════ SHUTTING DOWN ═══════════════════════════');
  console.log('  [STATUS]          Received shutdown signal');
  await redis.disconnect();
  await database.disconnect();
  console.log('  [STATUS]          Cleanup complete. Goodbye!');
  console.log('═════════════════════════════════════════════════════════════════');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n═══════════════════════ SHUTTING DOWN ═══════════════════════════');
  console.log('  [STATUS]          Received termination signal');
  await redis.disconnect();
  await database.disconnect();
  console.log('  [STATUS]          Cleanup complete. Goodbye!');
  console.log('═════════════════════════════════════════════════════════════════');
  process.exit(0);
});

main().catch((error) => {
  BotLogger.error('Failed to start bot', error);
  process.exit(1);
});