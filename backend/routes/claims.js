import { Router } from "express";
import Claim from "../models/Claim.js";
import Item from "../models/Item.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

router.get("/mine", requireAuth, async (req, res, next) => {
  try {
    const claims = await Claim.find({ student: req.user._id })
      .populate("item")
      .populate("student", "name email")
      .sort({ createdAt: -1 });
    res.json({ claims });
  } catch (error) { next(error); }
});

router.get("/", requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const claims = await Claim.find()
      .populate("item")
      .populate("student", "name email")
      .sort({ createdAt: -1 });
    res.json({ claims });
  } catch (error) { next(error); }
});

router.post("/:itemId", requireAuth, async (req, res, next) => {
  try {
    if (req.user.role === "admin") return res.status(400).json({ message: "Admin accounts cannot claim items." });
    const item = await Item.findById(req.params.itemId);
    if (!item) return res.status(404).json({ message: "Item not found." });
    if (item.type !== "found") return res.status(400).json({ message: "Only found items can be claimed." });
    if (item.status !== "available") return res.status(400).json({ message: "This item is no longer available." });
    if (String(item.reportedBy) === String(req.user._id)) {
      return res.status(400).json({ message: "You cannot claim your own report." });
    }
    const existing = await Claim.findOne({ item: item._id, student: req.user._id });
    if (existing) return res.status(409).json({ message: "You have already submitted a claim for this item." });
    const claim = await Claim.create({ item: item._id, student: req.user._id, message: req.body.message || "" });
    await claim.populate([{ path: "item" }, { path: "student", select: "name email" }]);
    res.status(201).json({ claim });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "You have already submitted a claim." });
    next(error);
  }
});

router.patch("/:claimId", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!["approved", "rejected", "pending"].includes(status)) {
      return res.status(400).json({ message: "Invalid claim status." });
    }
    const claim = await Claim.findByIdAndUpdate(req.params.claimId, { status }, { new: true })
      .populate("item").populate("student", "name email");
    if (!claim) return res.status(404).json({ message: "Claim not found." });
    if (status === "approved" && claim.item) {
      await Item.findByIdAndUpdate(claim.item._id, { status: "claimed" });
    }
    res.json({ claim });
  } catch (error) { next(error); }
});

export default router;
