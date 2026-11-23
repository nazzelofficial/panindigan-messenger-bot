import type { CommandDefinition } from "../../types.js";

import addfilter from "./addfilter.js";
import antispam from "./antispam.js";
import antispamconfig from "./antispamconfig.js";
import ban from "./ban.js";
import blacklist from "./blacklist.js";
import blacklistlist from "./blacklistlist.js";
import clearreports from "./clearreports.js";
import clearwarn from "./clearwarn.js";
import filterlist from "./filterlist.js";
import kick from "./kick.js";
import lockdown from "./lockdown.js";
import modlogs from "./modlogs.js";
import mute from "./mute.js";
import removefilter from "./removefilter.js";
import report from "./report.js";
import reports from "./reports.js";
import restrict from "./restrict.js";
import unban from "./unban.js";
import unblacklist from "./unblacklist.js";
import unmute from "./unmute.js";
import unlockdown from "./unlockdown.js";
import unrestrict from "./unrestrict.js";
import warn from "./warn.js";
import warnings from "./warnings.js";
import wordfilter from "./wordfilter.js";

export const moderationCommands: CommandDefinition[] = [
  warn,
  warnings,
  clearwarn,
  mute,
  unmute,
  ban,
  unban,
  kick,
  restrict,
  unrestrict,
  report,
  reports,
  clearreports,
  antispam,
  antispamconfig,
  blacklist,
  unblacklist,
  blacklistlist,
  wordfilter,
  addfilter,
  removefilter,
  filterlist,
  lockdown,
  unlockdown,
  modlogs,
];
