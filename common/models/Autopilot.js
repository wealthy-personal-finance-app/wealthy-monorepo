import mongoose from "mongoose";

const autopilotSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    flowName: { type: String, required: true }, // e.g., "Apartment Rent"
    amount: { type: Number, required: true },
    type: { 
      type: String, 
      enum: ["expense", "income", "asset", "liability"], 
      required: true 
    },
    parentCategory: { type: String, required: true },
    subCategory: { type: String, required: true },
    
    // Frequency Logic
    frequency: { 
      type: String, 
      enum: ["daily", "weekly", "monthly"], 
      required: true 
    },
    scheduledDay: { type: Number, required: true }, // 1-31 for monthly, 1-7 for weekly
    
    isActive: { type: Boolean, default: true },
    nextOccurrence: { type: Date, required: true },
    lastRun: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model("Autopilot", autopilotSchema);