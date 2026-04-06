import mongoose from "mongoose"

const transactionSchema = new mongoose.Schema(
  {
    userId: {type: mongoose.Schema.Types.ObjectId, ref: "User", required: true},
    amount: {type: Number, required: true},
    type: {
      type: String,
      enum: ["expense", "income", "asset", "liability"],
      required: true,
    },
    parentCategory: {type: String, required: true},
    subCategory: {type: String, required: true},
    isCustom: {type: Boolean, default: false},
    date: {type: Date, required: true},
    note: {type: String, default: ""},
  },
  {timestamps: true}
)

export default mongoose.model("Transaction", transactionSchema)
