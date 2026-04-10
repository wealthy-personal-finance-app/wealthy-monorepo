import Autopilot from "@wealthy/common/models/Autopilot.js";
import { successResponse, errorResponse } from "@wealthy/common";

// 1. Get all flows for a user
export const getAutopilotFlows = async (req, res) => {
  try {
    const flows = await Autopilot.find({ userId: req.user.id });
    return successResponse(res, 200, "Autopilot flows fetched", { data: flows });
  } catch (error) {
    return errorResponse(res, 500, "Failed to fetch flows", error);
  }
};

// 2. Create a new flow
export const createAutopilot = async (req, res) => {
  try {
    const { flowName, amount, type, parentCategory, subCategory, frequency, scheduledDay } = req.body;

    // Basic calculation for nextOccurrence (we can refine this later)
    let nextOccurrence = new Date();
    // Setting to midnight to avoid precision issues with the cron worker
    nextOccurrence.setHours(0, 0, 0, 0); 

    const newFlow = await Autopilot.create({
      userId: req.user.id,
      flowName,
      amount,
      type,
      parentCategory,
      subCategory,
      frequency,
      scheduledDay,
      nextOccurrence
    });

    return successResponse(res, 201, "Autopilot flow created", { data: newFlow });
  } catch (error) {
    return errorResponse(res, 500, "Failed to create flow", error);
  }
};

// 3. Update an existing flow
export const updateAutopilot = async (req, res) => {
  try {
    const flow = await Autopilot.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      req.body,
      { new: true }
    );
    if (!flow) return errorResponse(res, 404, "Flow not found");
    return successResponse(res, 200, "Flow updated", { data: flow });
  } catch (error) {
    return errorResponse(res, 500, "Update failed", error);
  }
};

// 4. Toggle Active/Inactive (The Switch in your UI)
export const toggleAutopilotStatus = async (req, res) => {
  try {
    const flow = await Autopilot.findOne({ _id: req.params.id, userId: req.user.id });
    if (!flow) return errorResponse(res, 404, "Flow not found");

    flow.isActive = !flow.isActive;
    await flow.save();

    return successResponse(res, 200, `Flow ${flow.isActive ? 'activated' : 'paused'}`, { data: flow });
  } catch (error) {
    return errorResponse(res, 500, "Toggle failed", error);
  }
};

// 5. Delete Autopilot (The one that caused your crash!)
export const deleteAutopilot = async (req, res) => {
  try {
    const flow = await Autopilot.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!flow) return errorResponse(res, 404, "Flow not found");
    return successResponse(res, 200, "Autopilot flow deleted");
  } catch (error) {
    return errorResponse(res, 500, "Deletion failed", error);
  }
};



//update newlly

// 6. Get Pending Items Due Today
export const getPendingFlows = async (req, res) => {
  try {
    const now = new Date();
    now.setHours(23, 59, 59, 999); // end of today

    const pending = await Autopilot.find({
      userId: req.user.id,
      isActive: true,
      nextOccurrence: { $lte: now }
    });

    return successResponse(res, 200, "Pending flows fetched", { 
      data: pending,
      count: pending.length
    });
  } catch (error) {
    return errorResponse(res, 500, "Failed to fetch pending flows", error);
  }
};

// 7. Log Single Pending Item
export const logSingleFlow = async (req, res) => {
  try {
    const flow = await Autopilot.findOne({ 
      _id: req.params.id, 
      userId: req.user.id,
      isActive: true 
    });

    if (!flow) return errorResponse(res, 404, "Flow not found or not active");

    const now = new Date();

    // Import Transaction dynamically to avoid circular deps
    const { default: Transaction } = await import(
      "@wealthy/common/models/Transaction.js"
    );

    // Create transaction
    await Transaction.create({
      userId: flow.userId,
      amount: flow.amount,
      type: flow.type,
      parentCategory: flow.parentCategory,
      subCategory: flow.subCategory,
      date: now,
      note: `Autopilot: ${flow.flowName}`
    });

    // Calculate next occurrence
    let nextDate = new Date(flow.nextOccurrence);
    if (flow.frequency === "daily")   nextDate.setUTCDate(nextDate.getUTCDate() + 1);
    if (flow.frequency === "weekly")  nextDate.setUTCDate(nextDate.getUTCDate() + 7);
    if (flow.frequency === "monthly") nextDate.setUTCMonth(nextDate.getUTCMonth() + 1);

    flow.nextOccurrence = nextDate;
    flow.lastRun = now;
    await flow.save();

    return successResponse(res, 200, `✅ Logged: ${flow.flowName}`, { data: flow });
  } catch (error) {
    return errorResponse(res, 500, "Failed to log flow", error);
  }
};

// 8. Log All Pending Items
export const logAllPendingFlows = async (req, res) => {
  try {
    const now = new Date();
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const pendingFlows = await Autopilot.find({
      userId: req.user.id,
      isActive: true,
      nextOccurrence: { $lte: endOfDay }
    });

    if (pendingFlows.length === 0) {
      return successResponse(res, 200, "No pending flows to log", { 
        logged: 0, data: [] 
      });
    }

    const { default: Transaction } = await import(
      "@wealthy/common/models/Transaction.js"
    );

    const logged = [];

    for (const flow of pendingFlows) {
      // Create transaction
      await Transaction.create({
        userId: flow.userId,
        amount: flow.amount,
        type: flow.type,
        parentCategory: flow.parentCategory,
        subCategory: flow.subCategory,
        date: now,
        note: `Autopilot: ${flow.flowName}`
      });

      // Calculate next occurrence
      let nextDate = new Date(flow.nextOccurrence);
      if (flow.frequency === "daily")   nextDate.setUTCDate(nextDate.getUTCDate() + 1);
      if (flow.frequency === "weekly")  nextDate.setUTCDate(nextDate.getUTCDate() + 7);
      if (flow.frequency === "monthly") nextDate.setUTCMonth(nextDate.getUTCMonth() + 1);

      flow.nextOccurrence = nextDate;
      flow.lastRun = now;
      await flow.save();

      logged.push({ id: flow._id, name: flow.flowName, amount: flow.amount });
    }

    return successResponse(res, 200, `✅ Logged ${logged.length} flows`, { 
      logged: logged.length, 
      data: logged 
    });
  } catch (error) {
    return errorResponse(res, 500, "Failed to log all flows", error);
  }
};

// 9. Skip Single Flow (push nextOccurrence forward by 1 period)
export const skipSingleFlow = async (req, res) => {
  try {
    const flow = await Autopilot.findOne({ 
      _id: req.params.id, 
      userId: req.user.id 
    });

    if (!flow) return errorResponse(res, 404, "Flow not found");

    // Push next occurrence forward by 1 period
    let nextDate = new Date(flow.nextOccurrence);
    if (flow.frequency === "daily")   nextDate.setUTCDate(nextDate.getUTCDate() + 1);
    if (flow.frequency === "weekly")  nextDate.setUTCDate(nextDate.getUTCDate() + 7);
    if (flow.frequency === "monthly") nextDate.setUTCMonth(nextDate.getUTCMonth() + 1);

    flow.nextOccurrence = nextDate;
    await flow.save();

    return successResponse(res, 200, `⏭️ Skipped: ${flow.flowName}`, { data: flow });
  } catch (error) {
    return errorResponse(res, 500, "Failed to skip flow", error);
  }
};

// 10. Skip All Pending Flows Today
export const skipAllPendingFlows = async (req, res) => {
  try {
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const pendingFlows = await Autopilot.find({
      userId: req.user.id,
      isActive: true,
      nextOccurrence: { $lte: endOfDay }
    });

    if (pendingFlows.length === 0) {
      return successResponse(res, 200, "No pending flows to skip", { 
        skipped: 0 
      });
    }

    const skipped = [];

    for (const flow of pendingFlows) {
      let nextDate = new Date(flow.nextOccurrence);
      if (flow.frequency === "daily")   nextDate.setUTCDate(nextDate.getUTCDate() + 1);
      if (flow.frequency === "weekly")  nextDate.setUTCDate(nextDate.getUTCDate() + 7);
      if (flow.frequency === "monthly") nextDate.setUTCMonth(nextDate.getUTCMonth() + 1);

      flow.nextOccurrence = nextDate;
      await flow.save();

      skipped.push({ id: flow._id, name: flow.flowName });
    }

    return successResponse(res, 200, `⏭️ Skipped ${skipped.length} flows`, { 
      skipped: skipped.length, 
      data: skipped 
    });
  } catch (error) {
    return errorResponse(res, 500, "Failed to skip all flows", error);
  }
};