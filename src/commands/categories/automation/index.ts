import type { CommandDefinition } from "../../types.js";

import addreaction from "./addreaction.js";
import addresponse from "./addresponse.js";
import addtrigger from "./addtrigger.js";
import autoannounce from "./autoannounce.js";
import autodelete from "./autodelete.js";
import autoresponder from "./autoresponder.js";
import autoreact from "./autoreact.js";
import automation from "./automation.js";
import cancelschedule from "./cancelschedule.js";
import goodbye from "./goodbye.js";
import keywordtrigger from "./keywordtrigger.js";
import reactions from "./reactions.js";
import removereaction from "./removereaction.js";
import removeresponse from "./removeresponse.js";
import removetrigger from "./removetrigger.js";
import responses from "./responses.js";
import schedule from "./schedule.js";
import scheduledmessage from "./scheduledmessage.js";
import schedules from "./schedules.js";
import setannounce from "./setannounce.js";
import setautodelete from "./setautodelete.js";
import setgoodbye from "./setgoodbye.js";
import setwelcome from "./setwelcome.js";
import triggers from "./triggers.js";
import welcome from "./welcome.js";

export const automationCommands: CommandDefinition[] = [
  autoresponder,
  addresponse,
  removeresponse,
  responses,
  welcome,
  setwelcome,
  goodbye,
  setgoodbye,
  autoreact,
  addreaction,
  removereaction,
  reactions,
  scheduledmessage,
  schedule,
  schedules,
  cancelschedule,
  autoannounce,
  setannounce,
  keywordtrigger,
  addtrigger,
  removetrigger,
  triggers,
  autodelete,
  setautodelete,
  automation,
];
