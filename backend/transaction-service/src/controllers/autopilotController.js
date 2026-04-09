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