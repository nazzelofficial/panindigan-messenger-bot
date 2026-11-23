import type { CommandDefinition } from "../../types.js";
import balance from "./balance.js";
import daily from "./daily.js";
import weekly from "./weekly.js";
import monthly from "./monthly.js";
import work from "./work.js";
import beg from "./beg.js";
import crime from "./crime.js";
import rob from "./rob.js";
import deposit from "./deposit.js";
import withdraw from "./withdraw.js";
import transfer from "./transfer.js";
import pay from "./pay.js";
import leaderboard from "./leaderboard.js";
import shop from "./shop.js";
import buy from "./buy.js";
import sell from "./sell.js";
import inventory from "./inventory.js";
import use from "./use.js";
import gift from "./gift.js";
import trade from "./trade.js";
import profilemoney from "./profilemoney.js";
import bank from "./bank.js";
import achievements from "./achievements.js";
import rewards from "./rewards.js";
import dailyinfo from "./dailyinfo.js";
import cooldowns from "./cooldowns.js";
import coinhistory from "./coinhistory.js";
import richest from "./richest.js";
import setcoins from "./setcoins.js";
import economy from "./economy.js";

export const economyCommands: CommandDefinition[] = [
  balance,
  daily,
  weekly,
  monthly,
  work,
  beg,
  crime,
  rob,
  deposit,
  withdraw,
  transfer,
  pay,
  leaderboard,
  shop,
  buy,
  sell,
  inventory,
  use,
  gift,
  trade,
  profilemoney,
  bank,
  achievements,
  rewards,
  dailyinfo,
  cooldowns,
  coinhistory,
  richest,
  setcoins,
  economy,
];
