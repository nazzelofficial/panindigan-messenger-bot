import type { CommandDefinition } from "../../types.js";
import ticTacToe from "./tic-tac-toe.js";
import connect4 from "./connect4.js";
import chess from "./chess.js";
import checkers from "./checkers.js";
import hangman from "./hangman.js";
import wordle from "./wordle.js";
import blackjack from "./blackjack.js";
import slots from "./slots.js";
import roulette from "./roulette.js";
import guessnumber from "./guessnumber.js";
import guessword from "./guessword.js";
import rps from "./rps.js";
import memory from "./memory.js";
import puzzle from "./puzzle.js";
import scramble from "./scramble.js";
import anagram from "./anagram.js";
import sudoku from "./sudoku.js";
import minesweeper from "./minesweeper.js";
import snake from "./snake.js";
import quizbattle from "./quizbattle.js";
import duel from "./duel.js";
import battle from "./battle.js";
import fishing from "./fishing.js";
import hunt from "./hunt.js";
import dailygame from "./dailygame.js";

export const gamesCommands: CommandDefinition[] = [
  ticTacToe,
  connect4,
  chess,
  checkers,
  hangman,
  wordle,
  blackjack,
  slots,
  roulette,
  guessnumber,
  guessword,
  rps,
  memory,
  puzzle,
  scramble,
  anagram,
  sudoku,
  minesweeper,
  snake,
  quizbattle,
  duel,
  battle,
  fishing,
  hunt,
  dailygame,
];
