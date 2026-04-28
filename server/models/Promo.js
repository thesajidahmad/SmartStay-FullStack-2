import mongoose from "mongoose";
const { Schema } = mongoose;

const promoSchema = new Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  discountPercent: { type: Number, required: true, min: 1, max: 100 },
  maxUses: { type: Number, default: null },   // null = unlimited
  usedCount: { type: Number, default: 0 },
  expiresAt: { type: Date, default: null },   // null = never expires
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const Promo = mongoose.model("Promo", promoSchema);
export default Promo;
