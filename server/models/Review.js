import mongoose from "mongoose";
const { Schema } = mongoose;

const reviewSchema = new Schema({
  room: { type: Schema.Types.ObjectId, ref: "Room", required: true },
  hotel: { type: Schema.Types.ObjectId, ref: "Hotel", required: true },
  user: { type: String, ref: "User", required: true },
  booking: { type: Schema.Types.ObjectId, ref: "Booking", required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true, trim: true },
}, { timestamps: true });

// One review per booking
reviewSchema.index({ booking: 1 }, { unique: true });

const Review = mongoose.model("Review", reviewSchema);
export default Review;
