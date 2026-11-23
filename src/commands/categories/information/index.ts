import type { CommandDefinition } from "../../types.js";
import profile from "./profile.js";
import userinfo from "./userinfo.js";
import accountinfo from "./accountinfo.js";
import groupinfo from "./groupinfo.js";
import threadinfo from "./threadinfo.js";
import members from "./members.js";
import membercount from "./membercount.js";
import adminslist from "./adminslist.js";
import botstats from "./botstats.js";
import serverstats from "./serverstats.js";
import messageinfo from "./messageinfo.js";
import avatar from "./avatar.js";
import id from "./id.js";
import inviteinfo from "./inviteinfo.js";
import time from "./time.js";
import date from "./date.js";
import calendar from "./calendar.js";
import weather from "./weather.js";
import news from "./news.js";
import define from "./define.js";
import translate from "./translate.js";
import wikipedia from "./wikipedia.js";
import facts from "./facts.js";
import quote from "./quote.js";
import randomfact from "./randomfact.js";

export const informationCommands: CommandDefinition[] = [
  profile,
  userinfo,
  accountinfo,
  groupinfo,
  threadinfo,
  members,
  membercount,
  adminslist,
  botstats,
  serverstats,
  messageinfo,
  avatar,
  id,
  inviteinfo,
  time,
  date,
  calendar,
  weather,
  news,
  define,
  translate,
  wikipedia,
  facts,
  quote,
  randomfact,
];
