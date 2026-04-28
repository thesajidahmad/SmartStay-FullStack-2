import Review from "../models/Review.js";
import Booking from "../models/Booking.js";

// POST /api/reviews  — submit a review (must have a completed booking)
export const createReview = async (req, res) => {
  try {
    const { bookingId, rating, comment } = req.body;
    const userId = req.user._id;

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
    if (booking.user.toString() !== userId.toString())
      return res.status(403).json({ success: false, message: "Not your booking" });
    if (booking.status === "cancelled")
      return res.status(400).json({ success: false, message: "Cannot review a cancelled booking" });

    const existing = await Review.findOne({ booking: bookingId });
    if (existing) return res.status(400).json({ success: false, message: "You already reviewed this booking" });

    const review = await Review.create({
      room: booking.room,
      hotel: booking.hotel,
      user: userId,
      booking: bookingId,
      rating: Number(rating),
      comment,
    });

    res.json({ success: true, message: "Review submitted", review });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/reviews/room/:roomId  — get all reviews for a room
export const getRoomReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ room: req.params.roomId })
      .populate("user", "username image")
      .sort({ createdAt: -1 });
    const avg = reviews.length
      ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
      : null;
    res.json({ success: true, reviews, averageRating: avg, totalReviews: reviews.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
