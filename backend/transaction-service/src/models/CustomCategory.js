import mongoose from "mongoose"

const customCategorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["expense", "income", "asset", "liability"],
      required: true,
    },
    parentCategory: {type: String, required: true, trim: true},
    subCategory: {type: String, required: true, trim: true},
  },
  {timestamps: true}
)

customCategorySchema.index(
  {userId: 1, type: 1, parentCategory: 1, subCategory: 1},
  {unique: true}
)

export default mongoose.model("CustomCategory", customCategorySchema)
