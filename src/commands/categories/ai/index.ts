import type { CommandDefinition } from "../../types.js";
import ask1 from "./ask1.js";
import ask2 from "./ask2.js";
import ask3 from "./ask3.js";
import ask4 from "./ask4.js";
import ask5 from "./ask5.js";
import ask6 from "./ask6.js";
import aistatus from "./aistatus.js";
import aimodels from "./aimodels.js";
import aibalance from "./aibalance.js";
import aiusage from "./aiusage.js";
import aitop from "./aitop.js";
import aicost from "./aicost.js";
import aifeedback from "./aifeedback.js";
import aicancel from "./aicancel.js";
import aihelp from "./aihelp.js";

export const aiCommands: CommandDefinition[] = [
  ask1,
  ask2,
  ask3,
  ask4,
  ask5,
  ask6,
  aistatus,
  aimodels,
  aibalance,
  aiusage,
  aitop,
  aicost,
  aifeedback,
  aicancel,
  aihelp,
];
