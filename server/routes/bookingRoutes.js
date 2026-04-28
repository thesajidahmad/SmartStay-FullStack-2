import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { checkAvailabilityAPI, createBooking, getHotelBookings, getUserBookings, stripePayment, cancelBooking } from "../controllers/bookingController.js";

const bookingRouter = express.Router();
bookingRouter.post("/check-availability", checkAvailabilityAPI);
bookingRouter.post("/book", protect, createBooking);
bookingRouter.get("/user", protect, getUserBookings);
bookingRouter.post("/cancel/:id", protect, cancelBooking);
bookingRouter.get("/hotel", protect, getHotelBookings);
bookingRouter.post("/stripe-payment", protect, stripePayment);
export default bookingRouter;
