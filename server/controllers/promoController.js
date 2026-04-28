import Promo from "../models/Promo.js";

// POST /api/promos/validate  — validate a promo code (any logged-in user)
export const validatePromo = async (req, res) => {
  try {
    const { code } = req.body;
    const promo = await Promo.findOne({ code: code.toUpperCase().trim() });

    if (!promo || !promo.isActive)
      return res.status(404).json({ success: false, message: "Invalid or expired promo code" });
    if (promo.expiresAt && new Date() > promo.expiresAt)
      return res.status(400).json({ success: false, message: "Promo code has expired" });
    if (promo.maxUses !== null && promo.usedCount >= promo.maxUses)
      return res.status(400).json({ success: false, message: "Promo code usage limit reached" });

    res.json({ success: true, discountPercent: promo.discountPercent, message: `${promo.discountPercent}% discount applied!` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/promos  — create a promo code (hotel owner only)
export const createPromo = async (req, res) => {
  try {
    const { code, discountPercent, maxUses, expiresAt } = req.body;
    const existing = await Promo.findOne({ code: code.toUpperCase().trim() });
    if (existing) return res.status(400).json({ success: false, message: "Promo code already exists" });

    const promo = await Promo.create({
      code,
      discountPercent: Number(discountPercent),
      maxUses: maxUses ? Number(maxUses) : null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    });
    res.json({ success: true, message: "Promo created", promo });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/promos  — list all promos (hotel owner only)
export const listPromos = async (req, res) => {
  try {
    const promos = await Promo.find().sort({ createdAt: -1 });
    res.json({ success: true, promos });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/promos/:id
export const deletePromo = async (req, res) => {
  try {
    await Promo.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Promo deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
