import type { Command, CommandContext } from '../../types/index.js';

interface GameState {
  board: string[];
  turn: string; // 'X' or 'O'
  players: {
    X: string;
    O: string;
  };
  lastMoveTime: number;
}

const activeGames = new Map<string, GameState>();

const command: Command = {
  name: 'tictactoe',
  aliases: ['ttt', 'xo'],
  description: 'Play Tic Tac Toe with another user',
  category: 'games',
  usage: 'tictactoe <tag_user> | <move_1-9> | stop',
  examples: ['tictactoe @Nazzel', 'tictactoe 5', 'tictactoe stop'],
  cooldown: 3000,

  async execute(context: CommandContext): Promise<void> {
    const { args, reply, event, api } = context;
    const threadId = String(event.threadID);
    const senderId = String(event.senderID);

    const game = activeGames.get(threadId);

    // Stop game
    if (args[0]?.toLowerCase() === 'stop') {
      if (game) {
        activeGames.delete(threadId);
        await reply('🛑 Game stopped.');
      } else {
        await reply('❌ No active game in this chat.');
      }
      return;
    }

    // Make a move
    if (game) {
      // Check if it's user's turn
      const currentPlayerId = game.turn === 'X' ? game.players.X : game.players.O;
      if (senderId !== currentPlayerId) {
        // Silent ignore if not their turn to prevent spam, or reply if direct
        // await reply('❌ It is not your turn!');
        return;
      }

      const move = parseInt(args[0]);
      if (isNaN(move) || move < 1 || move > 9) {
        await reply('❌ Invalid move! Please choose a number between 1 and 9.');
        return;
      }

      const index = move - 1;
      if (game.board[index] !== '⬜') {
        await reply('❌ That spot is already taken!');
        return;
      }

      // Update board
      game.board[index] = game.turn === 'X' ? '❌' : '⭕';
      
      // Check win
      const winner = checkWin(game.board);
      if (winner) {
        const winnerId = winner === '❌' ? game.players.X : game.players.O;
        const winnerName = (await api.getUserInfo(winnerId))[winnerId].name;
        await reply(renderBoard(game.board) + `\n\n🎉 ${winnerName} (${winner}) wins!`);
        activeGames.delete(threadId);
        return;
      }

      // Check draw
      if (!game.board.includes('⬜')) {
        await reply(renderBoard(game.board) + '\n\n🤝 It\'s a draw!');
        activeGames.delete(threadId);
        return;
      }

      // Switch turn
      game.turn = game.turn === 'X' ? 'O' : 'X';
      game.lastMoveTime = Date.now();
      
      const nextPlayerId = game.turn === 'X' ? game.players.X : game.players.O;
      const nextPlayerName = (await api.getUserInfo(nextPlayerId))[nextPlayerId].name;

      await reply(renderBoard(game.board) + `\n\nTurn: ${nextPlayerName} (${game.turn === 'X' ? '❌' : '⭕'})`);
      return;
    }

    // Start new game
    if (Object.keys(event.mentions).length === 0) {
      await reply('❌ Please tag someone to play with!\nUsage: tictactoe @User');
      return;
    }

    const opponentId = Object.keys(event.mentions)[0];
    
    if (opponentId === senderId) {
        await reply('❌ You cannot play against yourself!');
        return;
    }

    // Initialize game
    activeGames.set(threadId, {
      board: Array(9).fill('⬜'),
      turn: 'X',
      players: {
        X: senderId,
        O: opponentId
      },
      lastMoveTime: Date.now()
    });

    const p1Name = (await api.getUserInfo(senderId))[senderId].name;
    const p2Name = (await api.getUserInfo(opponentId))[opponentId].name;

    await reply(`🎮 Tic Tac Toe Started!
    
❌ ${p1Name} vs ⭕ ${p2Name}

${renderBoard(Array(9).fill('⬜'))}

${p1Name} (❌) goes first!
Type a number 1-9 to move.`);
  }
};

function checkWin(board: string[]): string | null {
  const wins = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
    [0, 4, 8], [2, 4, 6]             // Diagonals
  ];

  for (const [a, b, c] of wins) {
    if (board[a] !== '⬜' && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
}

function renderBoard(board: string[]): string {
  return `
${board[0]} ${board[1]} ${board[2]}
${board[3]} ${board[4]} ${board[5]}
${board[6]} ${board[7]} ${board[8]}
`;
}

export default command;
