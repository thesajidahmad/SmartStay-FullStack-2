import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { createReview, getRoomReviews } from "../controllers/reviewController.js";

const reviewRouter = express.Router();
reviewRouter.post("/", protect, createReview);
reviewRouter.get("/room/:roomId", getRoomReviews);
export default reviewRouter;
