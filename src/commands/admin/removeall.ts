import type { Command, CommandContext } from '../../types/index.js';
import { safeGetThreadInfo, botGroupAdminStatus } from '../../lib/apiHelpers.js';
import { BotLogger } from '../../lib/logger.js';

const command: Command = {
  name: 'removeall',
  aliases: ['kickall', 'cleargroup', 'clearmembers'],
  description: 'Kick all non-admin members from the group (Owner only)',
  category: 'admin',
  usage: 'removeall [confirm]',
  examples: ['removeall', 'removeall confirm'],
  cooldown: 60000,
  ownerOnly: true,

  async execute(context: CommandContext): Promise<void> {
    const { api, event, reply, args, prefix } = context;
    const threadId = String(event.threadID);
    const botId = String(api.getCurrentUserID());
    const senderId = String(event.senderID);
    
    if (!event.isGroup && !event.threadID) {
      await reply(`┏━━━━━━━━━━━━━━━━━━━┓
┃  ❌ ERROR
┗━━━━━━━━━━━━━━━━━━━┛
This command only works in group chats!`);
      return;
    }
    
    let threadInfo: any = null;
    let groupName = 'Unknown Group';
    let adminIDs: string[] = [];
    let allParticipants: string[] = [];
    
    try {
      threadInfo = await safeGetThreadInfo(api, threadId);
      
      if (!threadInfo) {
        await reply(`┏━━━━━━━━━━━━━━━━━━━┓
┃  ❌ ERROR
┗━━━━━━━━━━━━━━━━━━━┛
Could not fetch group info. Please try again.`);
        return;
      }
      
      groupName = threadInfo.threadName || threadInfo.name || 'Unknown Group';
      
      adminIDs = (threadInfo.adminIDs || []).map((a: any) => String(a.id || a).trim());
      
      if (threadInfo.participantIDs && Array.isArray(threadInfo.participantIDs)) {
        allParticipants = threadInfo.participantIDs.map((id: any) => String(id).trim());
      } else if (threadInfo.participants && Array.isArray(threadInfo.participants)) {
        allParticipants = threadInfo.participants.map((p: any) => String(p.userID || p.id || p).trim());
      } else if (threadInfo.userInfo && Array.isArray(threadInfo.userInfo)) {
        allParticipants = threadInfo.userInfo.map((u: any) => String(u.id).trim());
      }
      
      BotLogger.debug(`RemoveAll: Found ${allParticipants.length} participants, ${adminIDs.length} admins`);
      
      if (allParticipants.length === 0) {
        await reply(`┏━━━━━━━━━━━━━━━━━━━┓
┃  ❌ ERROR
┗━━━━━━━━━━━━━━━━━━━┛
Could not fetch member list. Group may be too large.`);
        return;
      }
      
      // Mass-kick must fail closed: without an admin list, admins cannot be protected.
      const isBotAdmin = botGroupAdminStatus(threadInfo, botId);
      if (isBotAdmin !== true) {
        await reply(`┏━━━━━━━━━━━━━━━━━━━┓
┃  ❌ CANNOT VERIFY ADMINS
┗━━━━━━━━━━━━━━━━━━━┛
${isBotAdmin === false ? 'Bot must be admin to kick members.\nPlease make bot admin first.' : 'Group admin list is unavailable\n(panindigan-automate), so admins cannot be protected.\nUse the kick command for single members instead.'}`);
        return;
      }
    } catch (e: any) {
      BotLogger.error('RemoveAll: Failed to get thread info', e);
      await reply(`┏━━━━━━━━━━━━━━━━━━━┓
┃  ❌ ERROR
┗━━━━━━━━━━━━━━━━━━━┛
Could not get group info: ${e.message || 'Unknown'}`);
      return;
    }
    
    const protectedIds = [...adminIDs, botId, senderId];
    const uniqueProtected = [...new Set(protectedIds)];
    
    const toKick = allParticipants.filter((id: string) => {
      return !uniqueProtected.includes(id);
    });
    
    const memberCount = allParticipants.length;
    const shortGroupName = groupName.length > 20 ? groupName.substring(0, 17) + '...' : groupName;
    
    if (args[0]?.toLowerCase() !== 'confirm') {
      await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  ⚠️ REMOVE ALL MEMBERS
┗━━━━━━━━━━━━━━━━━━━━━━━━━━┛

📛 Group: ${shortGroupName}
👥 Total Members: ${memberCount}
🎯 To Remove: ${toKick.length}
🛡️ Protected (Admins): ${uniqueProtected.length}

━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ WARNING: This will REMOVE all
non-admin members from the group!

✅ Admins will NOT be removed.
✅ Bot will NOT be removed.
✅ You will NOT be removed.

💡 To confirm, type:
${prefix}removeall confirm
━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      return;
    }
    
    if (toKick.length === 0) {
      await reply(`┏━━━━━━━━━━━━━━━━━━━┓
┃  ℹ️ INFO
┗━━━━━━━━━━━━━━━━━━━┛
No members to remove! Only admins remain.`);
      return;
    }
    
    await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  🔄 REMOVING MEMBERS...
┗━━━━━━━━━━━━━━━━━━━━━━━━━━┛

📛 ${shortGroupName}
👥 Removing: ${toKick.length} members
🛡️ Admins Protected: ${uniqueProtected.length}
⏳ Estimated: ~${Math.ceil(toKick.length * 1.5)}s

Please wait...`);
    
    let kicked = 0;
    let failed = 0;
    
    for (const userId of toKick) {
      try {
        await api.removeUserFromGroup(userId, threadId);
        kicked++;
        BotLogger.debug(`RemoveAll: Removed ${userId} from ${threadId}`);
      } catch (e: any) {
        failed++;
        BotLogger.debug(`RemoveAll: Failed to remove ${userId}: ${e.message || e}`);
      }
      
      await new Promise(r => setTimeout(r, 1000));
    }
    
    const successRate = toKick.length > 0 ? Math.round((kicked / toKick.length) * 100) : 0;
    const statusEmoji = successRate >= 80 ? '✅' : successRate >= 50 ? '⚠️' : '❌';
    
    const timestamp = new Date().toLocaleString('en-PH', {
      timeZone: 'Asia/Manila',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    
    await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  ${statusEmoji} OPERATION COMPLETE
┗━━━━━━━━━━━━━━━━━━━━━━━━━━┛

✅ Removed: ${kicked} members
❌ Failed: ${failed}
📈 Success Rate: ${successRate}%
🛡️ Admins Safe: ${uniqueProtected.length}

⏰ ${timestamp}
${kicked > 0 ? '🎯 All non-admin members removed!' : '⚠️ No members were removed!'}
${failed > 0 ? `💡 ${failed} may have already left the group` : ''}`);
    
    BotLogger.info(`RemoveAll: Removed ${kicked}/${toKick.length} from ${threadId} (${groupName}), Protected: ${uniqueProtected.length}`);
  }
};

export default command;
