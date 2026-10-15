import "dotenv/config";
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import { connectDB } from "./config/db.js";
import User from "./models/User.js";
import authRoutes from "./routes/auth.js";
import itemRoutes from "./routes/items.js";
import claimRoutes from "./routes/claims.js";

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/claims", claimRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  if (err.name === "MulterError") {
    return res.status(400).json({ message: err.code === "LIMIT_FILE_SIZE" ? "Image must be 5 MB or smaller." : err.message });
  }
  if (err.message === "Please upload an image file.") return res.status(400).json({ message: err.message });
  if (err.name === "ValidationError") return res.status(400).json({ message: err.message });
  res.status(500).json({ message: "Something went wrong. Please try again." });
});

async function seedAdmin() {
  const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.warn("ADMIN_EMAIL / ADMIN_PASSWORD not set; admin account was not seeded.");
    return;
  }
  if (ADMIN_PASSWORD.length < 12) {
    throw new Error("Use an ADMIN_PASSWORD with at least 12 characters.");
  }
  const email = ADMIN_EMAIL.toLowerCase().trim();
  const existing = await User.findOne({ email }).select("+password");
  if (existing) {
    existing.name = ADMIN_NAME || "College Admin";
    existing.role = "admin";
    existing.password = ADMIN_PASSWORD;
    await existing.save();
  } else {
    await User.create({ name: ADMIN_NAME || "College Admin", email, password: ADMIN_PASSWORD, role: "admin" });
  }
  console.log(`Admin account ready: ${email}`);
}

const port = process.env.PORT || 5000;
connectDB()
  .then(seedAdmin)
  .then(() => app.listen(port, () => console.log(`API running at http://localhost:${port}`)))
  .catch((error) => {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  });
