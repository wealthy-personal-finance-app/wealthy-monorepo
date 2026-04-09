// import cron from "node-cron";
// import Autopilot from "@wealthy/common/models/Autopilot.js";
// import Transaction from "@wealthy/common/models/Transaction.js";
// import { logger } from "@wealthy/common";

// export const startAutopilotCron = () => {
//   // Check every day at midnight
//   cron.schedule("0 0 * * *", async () => {
//     const now = new Date();
//     const dueFlows = await Autopilot.find({ 
//       isActive: true, 
//       nextOccurrence: { $lte: now } 
//     });

//     for (const flow of dueFlows) {
//       // 1. Create the Transaction record
//       await Transaction.create({
//         userId: flow.userId,
//         amount: flow.amount,
//         type: flow.type,
//         parentCategory: flow.parentCategory,
//         subCategory: flow.subCategory,
//         date: now,
//         note: `Auto-generated: ${flow.flowName}`
//       });

//       // 2. Calculate next occurrence
//       let next = new Date(flow.nextOccurrence);
//       if (flow.frequency === "daily") next.setDate(next.getDate() + 1);
//       if (flow.frequency === "weekly") next.setDate(next.getDate() + 7);
//       if (flow.frequency === "monthly") next.setMonth(next.getMonth() + 1);

//       flow.nextOccurrence = next;
//       flow.lastRun = now;
//       await flow.save();
//     }
//   });
// };
import cron from "node-cron";
import Autopilot from "@wealthy/common/models/Autopilot.js";
import Transaction from "@wealthy/common/models/Transaction.js";
import { logger } from "@wealthy/common";

const log = logger.child({ service: 'AUTOPILOT-WORKER' });

export const startAutopilotCron = () => {
  // Runs every day at midnight (Server Time)
  // If hosted on Railway/AWS with TZ=Asia/Colombo, this is 12:00 AM SL time.
  cron.schedule("0 0 * * *", async () => {
    log.info("Checking for due autopilot transactions...");
    
    try {
      const now = new Date();

      // Find flows that are active and due (nextOccurrence <= now)
      const dueFlows = await Autopilot.find({ 
        isActive: true, 
        nextOccurrence: { $lte: now } 
      });

      if (dueFlows.length === 0) {
        log.info("No autopilot flows due today.");
        return;
      }

      for (const flow of dueFlows) {
        // 1. Create the Transaction
        await Transaction.create({
          userId: flow.userId,
          amount: flow.amount,
          type: flow.type,
          parentCategory: flow.parentCategory,
          subCategory: flow.subCategory,
          date: now, // The date it actually posted
          note: `Autopilot: ${flow.flowName}`
        });

        // 2. Calculate the NEXT date
        let nextDate = new Date(flow.nextOccurrence);
        
        if (flow.frequency === "daily") {
          nextDate.getUTCDate() + 1; // Basic logic: add 1 day
          nextDate.setUTCDate(nextDate.getUTCDate() + 1);
        } else if (flow.frequency === "weekly") {
          nextDate.setUTCDate(nextDate.getUTCDate() + 7);
        } else if (flow.frequency === "monthly") {
          nextDate.setUTCMonth(nextDate.getUTCMonth() + 1);
        }

        // 3. Save the update back to the Autopilot template
        flow.nextOccurrence = nextDate;
        flow.lastRun = now;
        await flow.save();
        
        log.info(`Successfully processed autopilot: ${flow.flowName} for user ${flow.userId}`);
      }
    } catch (error) {
      log.error("Autopilot Cron Error:", { error: error.message });
    }
  });
};