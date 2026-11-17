import type { Command } from '../../types/index.js';

const games = new Map<string, { playerCards: string[], dealerCards: string[], deck: string[], gameOver: boolean }>();

const suits = ['♠️', '♥️', '♦️', '♣️'];
const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function createDeck(): string[] {
  const deck: string[] = [];
  for (const suit of suits) {
    for (const value of values) {
      deck.push(`${value}${suit}`);
    }
  }
  return deck.sort(() => Math.random() - 0.5);
}

function getCardValue(card: string): number {
  const value = card.replace(/[♠️♥️♦️♣️]/g, '');
  if (['J', 'Q', 'K'].includes(value)) return 10;
  if (value === 'A') return 11;
  return parseInt(value);
}

function calculateHand(cards: string[]): number {
  let total = cards.reduce((sum, card) => sum + getCardValue(card), 0);
  let aces = cards.filter(c => c.startsWith('A')).length;
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}

export const command: Command = {
  name: 'blackjack',
  aliases: ['bj', '21'],
  description: 'Play Blackjack',
  category: 'games',
  usage: 'blackjack | blackjack hit | blackjack stand',
  examples: ['blackjack', 'blackjack hit'],
  cooldown: 3000,

  async execute({ reply, args, event }) {
    const threadId = event.threadId;

    if (!args.length) {
      if (games.has(threadId) && !games.get(threadId)!.gameOver) {
        return reply('❌ Game in progress! Use hit or stand.');
      }
      const deck = createDeck();
      const playerCards = [deck.pop()!, deck.pop()!];
      const dealerCards = [deck.pop()!, deck.pop()!];
      games.set(threadId, { playerCards, dealerCards, deck, gameOver: false });

      const playerTotal = calculateHand(playerCards);
      if (playerTotal === 21) {
        games.get(threadId)!.gameOver = true;
        return reply(`🃏 BLACKJACK!\n\nYour cards: ${playerCards.join(' ')} (21)\nDealer: ${dealerCards.join(' ')} (${calculateHand(dealerCards)})\n\n🎉 YOU WIN!`);
      }

      return reply(`🃏 BLACKJACK\n\nYour cards: ${playerCards.join(' ')} (${playerTotal})\nDealer shows: ${dealerCards[0]} ?\n\nhit or stand?`);
    }

    const game = games.get(threadId);
    if (!game || game.gameOver) return reply('❌ No active game. Start with: blackjack');

    if (args[0] === 'hit') {
      game.playerCards.push(game.deck.pop()!);
      const playerTotal = calculateHand(game.playerCards);

      if (playerTotal > 21) {
        game.gameOver = true;
        return reply(`🃏 BUST!\n\nYour cards: ${game.playerCards.join(' ')} (${playerTotal})\n\n💀 You lose!`);
      }

      if (playerTotal === 21) {
        game.gameOver = true;
        return reply(`🃏 21!\n\nYour cards: ${game.playerCards.join(' ')} (21)\n\n🎉 Perfect!`);
      }

      return reply(`🃏 Your cards: ${game.playerCards.join(' ')} (${playerTotal})\nDealer shows: ${game.dealerCards[0]} ?\n\nhit or stand?`);
    }

    if (args[0] === 'stand') {
      game.gameOver = true;
      while (calculateHand(game.dealerCards) < 17) {
        game.dealerCards.push(game.deck.pop()!);
      }

      const playerTotal = calculateHand(game.playerCards);
      const dealerTotal = calculateHand(game.dealerCards);

      let result = '';
      if (dealerTotal > 21) result = '🎉 Dealer busts! YOU WIN!';
      else if (dealerTotal > playerTotal) result = '💀 Dealer wins!';
      else if (playerTotal > dealerTotal) result = '🎉 YOU WIN!';
      else result = '🤝 Push (Tie)!';

      return reply(`🃏 BLACKJACK\n\nYour cards: ${game.playerCards.join(' ')} (${playerTotal})\nDealer: ${game.dealerCards.join(' ')} (${dealerTotal})\n\n${result}`);
    }

    return reply('❌ Use "hit" or "stand"');
  },
};
