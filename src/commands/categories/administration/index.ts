import type { CommandDefinition } from "../../types.js";
import help from "./help.js";
import commands from "./commands.js";
import prefix from "./prefix.js";
import setprefix from "./setprefix.js";
import botinfo from "./botinfo.js";
import uptime from "./uptime.js";
import status from "./status.js";
import settings from "./settings.js";
import setlanguage from "./setlanguage.js";
import language from "./language.js";
import maintenance from "./maintenance.js";
import modules from "./modules.js";
import enable from "./enable.js";
import disable from "./disable.js";
import reload from "./reload.js";
import ping from "./ping.js";
import latency from "./latency.js";
import diagnostics from "./diagnostics.js";
import config from "./config.js";
import permissions from "./permissions.js";
import setadmin from "./setadmin.js";
import removeadmin from "./removeadmin.js";
import admins from "./admins.js";
import activity from "./activity.js";
import changelog from "./changelog.js";
import developer from "./developer.js";
import broadcast from "./broadcast.js";
import addmember from "./addmember.js";
import announcements from "./announcements.js";
import systeminfo from "./systeminfo.js";
import health from "./health.js";
import restart from "./restart.js";
import maintenancehistory from "./maintenancehistory.js";
import maintenanceconfig from "./maintenanceconfig.js";
import owner from "./owner.js";

export const administrationCommands: CommandDefinition[] = [
  help,
  commands,
  prefix,
  setprefix,
  botinfo,
  uptime,
  status,
  settings,
  setlanguage,
  language,
  maintenance,
  modules,
  enable,
  disable,
  reload,
  ping,
  latency,
  diagnostics,
  config,
  permissions,
  setadmin,
  removeadmin,
  admins,
  activity,
  changelog,
  developer,
  broadcast,
  addmember,
  announcements,
  systeminfo,
  health,
  restart,
  maintenancehistory,
  maintenanceconfig,
  owner,
];
