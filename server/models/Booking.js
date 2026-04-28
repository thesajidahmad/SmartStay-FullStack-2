import mongoose from "mongoose";
const { Schema } = mongoose;

const bookingSchema = new Schema({
  user: { type: String, ref: "User", required: true },
  room: { type: Schema.Types.ObjectId, ref: "Room", required: true },
  hotel: { type: Schema.Types.ObjectId, ref: "Hotel", required: true },
  bookingType: { type: String, enum: ["nightly", "hourly"], default: "nightly" },
  checkInDate: { type: Date, required: true },
  checkOutDate: { type: Date, required: true },
  checkInTime: { type: String, default: null },
  checkOutTime: { type: String, default: null },
  totalPrice: { type: Number, required: true },
  discountApplied: { type: Number, default: 0 },
  guests: { type: Number, required: true },
  status: { type: String, enum: ["pending", "confirmed", "cancelled"], default: "pending" },
  paymentMethod: { type: String, default: "Pay At Hotel" },
  isPaid: { type: Boolean, default: false },
}, { timestamps: true });

const Booking = mongoose.model("Booking", bookingSchema);
export default Booking;
