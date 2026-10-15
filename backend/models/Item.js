import mongoose from "mongoose";

const itemSchema = new mongoose.Schema(
  {
    itemName: { type: String, required: true, trim: true, maxlength: 120 },
    imageUrl: { type: String, required: true },
    imagePublicId: { type: String, required: true },
    place: { type: String, required: true, trim: true, maxlength: 160 },
    date: { type: Date, required: true },
    description: { type: String, trim: true, maxlength: 1000, default: "" },
    type: { type: String, enum: ["lost", "found"], required: true },
    status: { type: String, enum: ["available", "claimed", "returned", "closed"], default: "available" },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

itemSchema.index({ itemName: "text", place: "text", description: "text" });
export default mongoose.model("Item", itemSchema);
