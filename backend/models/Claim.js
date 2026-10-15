import mongoose from "mongoose";

const claimSchema = new mongoose.Schema(
  {
    item: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: String, trim: true, maxlength: 600, default: "" },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  },
  { timestamps: true }
);

claimSchema.index({ item: 1, student: 1 }, { unique: true });
export default mongoose.model("Claim", claimSchema);
