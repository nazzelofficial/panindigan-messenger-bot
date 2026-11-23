import type { CommandDefinition } from "../../types.js";
import rank from "./rank.js";
import level from "./level.js";
import xp from "./xp.js";
import leaderboardxp from "./leaderboardxp.js";
import levelstats from "./levelstats.js";
import setxp from "./setxp.js";
import addxp from "./addxp.js";
import removexp from "./removexp.js";
import resetxp from "./resetxp.js";
import levelconfig from "./levelconfig.js";
import levelup from "./levelup.js";
import leveldown from "./leveldown.js";
import rewardslevel from "./rewardslevel.js";
import setlevelreward from "./setlevelreward.js";
import removelevelreward from "./removelevelreward.js";
import levelrewards from "./levelrewards.js";
import rankcard from "./rankcard.js";
import topusers from "./topusers.js";
import activityrank from "./activityrank.js";
import weeklyrank from "./weeklyrank.js";
import monthlyrank from "./monthlyrank.js";
import xpboost from "./xpboost.js";
import setxpboost from "./setxpboost.js";
import removeboost from "./removeboost.js";
import leveling from "./leveling.js";

export const levelingCommands: CommandDefinition[] = [
  rank,
  level,
  xp,
  leaderboardxp,
  levelstats,
  setxp,
  addxp,
  removexp,
  resetxp,
  levelconfig,
  levelup,
  leveldown,
  rewardslevel,
  setlevelreward,
  removelevelreward,
  levelrewards,
  rankcard,
  topusers,
  activityrank,
  weeklyrank,
  monthlyrank,
  xpboost,
  setxpboost,
  removeboost,
  leveling,
];
