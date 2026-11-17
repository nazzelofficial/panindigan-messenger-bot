import type { Command, CommandContext } from '../../types/index.js';

const command: Command = {
  name: 'id',
  aliases: ['uid', 'userid'],
  description: 'Get user ID or thread ID',
  category: 'utility',
  usage: 'id [@mention]',
  examples: ['id', 'id @user'],

  async execute(context: CommandContext): Promise<void> {
    const { event, reply } = context;
    
    let response = `╔═══════════════════════════════╗\n`;
    response += `║ 🆔 ID INFO\n`;
    response += `╠═══════════════════════════════╣\n`;
    response += `║ Your ID: ${event.senderId}\n`;
    response += `║ Thread ID: ${event.threadId}\n`;
    
    if (event.mentions && Object.keys(event.mentions).length > 0) {
      response += `╠═══════════════════════════════╣\n`;
      response += `║ Mentioned Users:\n`;
      for (const [id, name] of Object.entries(event.mentions)) {
        response += `║ • ${name}: ${id}\n`;
      }
    }
    
    response += `╚═══════════════════════════════╝`;
    
    await reply(response);
  }
};

export default command;
