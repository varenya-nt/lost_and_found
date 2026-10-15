import { Router } from "express";
import Item from "../models/Item.js";
import Claim from "../models/Claim.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";
import { uploadImage } from "../utils/uploadImage.js";
import cloudinary from "../config/cloudinary.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const { search = "", type = "all", status = "all" } = req.query;
    const filter = {};
    if (["lost", "found"].includes(type)) filter.type = type;
    if (["available", "claimed", "returned", "closed"].includes(status)) filter.status = status;
    if (search.trim()) {
      const safe = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { itemName: { $regex: safe, $options: "i" } },
        { place: { $regex: safe, $options: "i" } },
        { description: { $regex: safe, $options: "i" } },
      ];
    }
    const items = await Item.find(filter).populate("reportedBy", "name").sort({ createdAt: -1 }).limit(200);
    res.json({ items });
  } catch (error) { next(error); }
});

router.get("/mine", requireAuth, async (req, res, next) => {
  try {
    const filter = req.user.role === "admin" ? {} : { reportedBy: req.user._id };
    const items = await Item.find(filter).populate("reportedBy", "name").sort({ createdAt: -1 });
    res.json({ items });
  } catch (error) { next(error); }
});

router.post("/", requireAuth, upload.single("image"), async (req, res, next) => {
  let uploaded;
  try {
    const { itemName, place, date, description = "", type } = req.body;
    if (!itemName?.trim() || !place?.trim() || !date || !["lost", "found"].includes(type)) {
      return res.status(400).json({ message: "Item name, place, date, and report type are required." });
    }
    if (!req.file) return res.status(400).json({ message: "Please select an item image." });
    uploaded = await uploadImage(req.file.buffer);
    const item = await Item.create({
      itemName: itemName.trim(),
      place: place.trim(),
      date: new Date(date),
      description: description.trim(),
      type,
      imageUrl: uploaded.secure_url,
      imagePublicId: uploaded.public_id,
      reportedBy: req.user._id,
    });
    await item.populate("reportedBy", "name");
    res.status(201).json({ item });
  } catch (error) {
    if (uploaded?.public_id) await cloudinary.uploader.destroy(uploaded.public_id).catch(() => {});
    next(error);
  }
});

router.patch("/:itemId/status", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!["available", "claimed", "returned", "closed"].includes(status)) {
      return res.status(400).json({ message: "Invalid item status." });
    }
    const item = await Item.findByIdAndUpdate(req.params.itemId, { status }, { new: true }).populate("reportedBy", "name");
    if (!item) return res.status(404).json({ message: "Item not found." });
    res.json({ item });
  } catch (error) { next(error); }
});

router.delete("/:itemId", requireAuth, async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.itemId);
    if (!item) return res.status(404).json({ message: "Item not found." });
    if (req.user.role !== "admin" && String(item.reportedBy) !== String(req.user._id)) {
      return res.status(403).json({ message: "You can only remove your own reports." });
    }
    await Claim.deleteMany({ item: item._id });
    await Item.findByIdAndDelete(item._id);
    if (item.imagePublicId) await cloudinary.uploader.destroy(item.imagePublicId).catch(() => {});
    res.json({ message: "Report deleted." });
  } catch (error) { next(error); }
});

export default router;
