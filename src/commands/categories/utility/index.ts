import type { CommandDefinition } from "../../types.js";
import calc from "./calc.js";
import math from "./math.js";
import convert from "./convert.js";
import shorten from "./shorten.js";
import qr from "./qr.js";
import barcode from "./barcode.js";
import password from "./password.js";
import uuid from "./uuid.js";
import choose from "./choose.js";
import poll from "./poll.js";
import vote from "./vote.js";
import countdown from "./countdown.js";
import stopwatch from "./stopwatch.js";
import timer from "./timer.js";
import reminder from "./reminder.js";
import notes from "./notes.js";
import todolist from "./todolist.js";
import addtask from "./addtask.js";
import removetask from "./removetask.js";
import tasks from "./tasks.js";
import text from "./text.js";
import reverse from "./reverse.js";
import uppercase from "./uppercase.js";
import lowercase from "./lowercase.js";
import wordcount from "./wordcount.js";

export const utilityCommands: CommandDefinition[] = [
  calc,
  math,
  convert,
  shorten,
  qr,
  barcode,
  password,
  uuid,
  choose,
  poll,
  vote,
  countdown,
  stopwatch,
  timer,
  reminder,
  notes,
  todolist,
  addtask,
  removetask,
  tasks,
  text,
  reverse,
  uppercase,
  lowercase,
  wordcount,
];
