import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { validatePromo, createPromo, listPromos, deletePromo } from "../controllers/promoController.js";

const promoRouter = express.Router();
promoRouter.post("/validate", protect, validatePromo);
promoRouter.post("/", protect, createPromo);        // owner only (trust middleware)
promoRouter.get("/", protect, listPromos);
promoRouter.delete("/:id", protect, deletePromo);
export default promoRouter;
