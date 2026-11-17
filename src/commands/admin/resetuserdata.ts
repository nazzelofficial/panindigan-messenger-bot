import type { Command, CommandContext } from '../../types/index.js';
import { safeGetUserInfo } from '../../lib/apiHelpers.js';
import { BotLogger } from '../../lib/logger.js';
import { database } from '../../database/index.js';
import { decorations } from '../../lib/messageFormatter.js';

const command: Command = {
  name: 'resetuserdata',
  aliases: ['resetuser', 'clearuserdata'],
  description: 'Reset a user\'s data in the database',
  category: 'admin',
  usage: 'resetuserdata <@mention|userId> confirm',
  examples: ['resetuserdata @user confirm', 'resetuserdata 123456789 confirm'],
  ownerOnly: true,
  cooldown: 10000,

  async execute(context: CommandContext): Promise<void> {
    const { api, event, args, reply, prefix } = context;
    
    let targetId: string | null = null;
    
    if (event.mentions && Object.keys(event.mentions).length > 0) {
      targetId = String(Object.keys(event.mentions)[0]);
    } else if (args[0]) {
      targetId = args[0].replace(/[^0-9]/g, '');
    }
    
    const confirmArg = args.find(a => a.toLowerCase() === 'confirm');
    
    if (!targetId) {
      await reply(`🗑️ 『 RESET USER DATA 』 🗑️
═══════════════════════════
${decorations.fire} Delete User Database Record
═══════════════════════════

◈ USAGE
═══════════════════════════
➤ ${prefix}resetuserdata @user confirm
➤ ${prefix}resetuserdata <ID> confirm

◈ WARNING
═══════════════════════════
⚠️ This action is IRREVERSIBLE!
⚠️ All user data will be deleted!`);
      return;
    }
    
    if (!confirmArg) {
      let userName = 'Unknown';
      try {
        const userInfo = await safeGetUserInfo(api, targetId);
        userName = userInfo[targetId]?.name || 'Unknown';
      } catch (e) {}
      
      await reply(`⚠️ 『 CONFIRM RESET 』 ⚠️
═══════════════════════════
${decorations.fire} Confirm Data Deletion
═══════════════════════════

◈ TARGET USER
═══════════════════════════
👤 Name: ${userName}
🆔 ID: ${targetId}

◈ WARNING
═══════════════════════════
This will delete:
• XP and Level data
• Coins and transactions
• All user statistics

◈ CONFIRM
═══════════════════════════
➤ ${prefix}resetuserdata ${targetId} confirm

⚠️ THIS CANNOT BE UNDONE!`);
      return;
    }
    
    try {
      const user = await database.getUser(targetId);
      
      if (!user) {
        await reply(`${decorations.fire} 『 NO DATA 』
═══════════════════════════
❌ No data found for this user`);
        return;
      }
      
      const deleted = await database.deleteUserAccount(targetId);
      
      if (!deleted) {
        await reply(`${decorations.fire} 『 ERROR 』
═══════════════════════════
❌ Failed to delete user data`);
        return;
      }
      
      BotLogger.info(`Reset user data for ${targetId}`);
      
      await reply(`🗑️ 『 DATA RESET 』 🗑️
═══════════════════════════
${decorations.fire} User Data Deleted
═══════════════════════════

◈ DELETED DATA
═══════════════════════════
🆔 User ID: ${targetId}
✅ Status: DELETED

◈ REMOVED
═══════════════════════════
• User profile
• XP and level
• Coins and transactions
• All statistics

═══════════════════════════
${decorations.sparkle} Database cleaned`);
    } catch (err) {
      BotLogger.error(`Failed to reset user data for ${targetId}`, err);
      await reply(`${decorations.fire} 『 ERROR 』
═══════════════════════════
❌ Failed to reset user data`);
    }
  }
};

export default command;
