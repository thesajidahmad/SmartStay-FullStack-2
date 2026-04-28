import transporter from "../configs/nodemailer.js";
import Booking from "../models/Booking.js";
import Hotel from "../models/Hotel.js";
import Room from "../models/Room.js";
import Promo from "../models/Promo.js";
import stripe from "stripe";

const checkAvailability = async ({ checkInDate, checkOutDate, room }) => {
  const bookings = await Booking.find({
    room,
    status: { $ne: "cancelled" },
    checkInDate: { $lte: checkOutDate },
    checkOutDate: { $gte: checkInDate },
  });
  return bookings.length === 0;
};

// POST /api/bookings/check-availability
export const checkAvailabilityAPI = async (req, res) => {
  try {
    const { room, checkInDate, checkOutDate } = req.body;
    const isAvailable = await checkAvailability({ checkInDate, checkOutDate, room });
    res.json({ success: true, isAvailable });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/bookings/book
export const createBooking = async (req, res) => {
  try {
    const { room, checkInDate, checkOutDate, guests, bookingType, checkInTime, checkOutTime, promoCode } = req.body;
    const user = req.user._id;

    const isAvailable = await checkAvailability({ checkInDate, checkOutDate, room });
    if (!isAvailable)
      return res.status(400).json({ success: false, message: "Room is not available" });

    const roomData = await Room.findById(room).populate("hotel");
    let totalPrice;

    if (bookingType === "hourly") {
      const [inH, inM] = checkInTime.split(":").map(Number);
      const [outH, outM] = checkOutTime.split(":").map(Number);
      const totalMinutes = (outH * 60 + outM) - (inH * 60 + inM);
      if (totalMinutes <= 0)
        return res.status(400).json({ success: false, message: "Check-out time must be after check-in time" });
      if (!roomData.pricePerHour)
        return res.status(400).json({ success: false, message: "This room does not support hourly booking" });
      totalPrice = roomData.pricePerHour * Math.ceil(totalMinutes / 60);
    } else {
      const nights = Math.ceil((new Date(checkOutDate) - new Date(checkInDate)) / (1000 * 3600 * 24));
      totalPrice = roomData.pricePerNight * nights;
    }

    // Apply promo if provided
    let discountApplied = 0;
    if (promoCode) {
      const promo = await Promo.findOne({ code: promoCode.toUpperCase().trim(), isActive: true });
      if (promo && (!promo.expiresAt || new Date() <= promo.expiresAt) &&
          (promo.maxUses === null || promo.usedCount < promo.maxUses)) {
        discountApplied = promo.discountPercent;
        totalPrice = Math.round(totalPrice * (1 - discountApplied / 100));
        await Promo.findByIdAndUpdate(promo._id, { $inc: { usedCount: 1 } });
      }
    }

    const booking = await Booking.create({
      user, room,
      hotel: roomData.hotel._id,
      guests: +guests,
      bookingType: bookingType || "nightly",
      checkInDate, checkOutDate,
      checkInTime: checkInTime || null,
      checkOutTime: checkOutTime || null,
      totalPrice,
      discountApplied,
    });

    const durationLabel = bookingType === "hourly"
      ? `${checkInTime} – ${checkOutTime}`
      : `${new Date(checkInDate).toDateString()} → ${new Date(checkOutDate).toDateString()}`;

    try {
      await transporter.sendMail({
        from: process.env.SENDER_EMAIL,
        to: req.user.email,
        subject: "SmartStay – Booking Confirmation",
        html: `<h2>Booking Confirmed!</h2>
          <p>Dear ${req.user.username},</p>
          <p>Thank you for booking with SmartStay!</p>
          <ul>
            <li><strong>Booking ID:</strong> ${booking._id}</li>
            <li><strong>Hotel:</strong> ${roomData.hotel.name}</li>
            <li><strong>Type:</strong> ${bookingType === "hourly" ? "Hourly" : "Nightly"}</li>
            <li><strong>Duration:</strong> ${durationLabel}</li>
            ${discountApplied ? `<li><strong>Discount:</strong> ${discountApplied}% off (code: ${promoCode})</li>` : ""}
            <li><strong>Total:</strong> ${process.env.VITE_CURRENCY || "₹"}${booking.totalPrice}</li>
          </ul>`,
      });
    } catch (_) { /* email failure should not block booking */ }

    res.json({ success: true, message: "Booking created successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to create booking" });
  }
};

// GET /api/bookings/user
export const getUserBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user._id })
      .populate("room hotel")
      .sort({ createdAt: -1 });
    res.json({ success: true, bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch bookings" });
  }
};

// POST /api/bookings/cancel/:id
export const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
    if (booking.user.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: "Not your booking" });
    if (booking.status === "cancelled")
      return res.status(400).json({ success: false, message: "Already cancelled" });

    // Only allow cancellation before check-in
    if (new Date(booking.checkInDate) <= new Date())
      return res.status(400).json({ success: false, message: "Cannot cancel after check-in date" });

    booking.status = "cancelled";
    await booking.save();
    res.json({ success: true, message: "Booking cancelled successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/bookings/hotel
export const getHotelBookings = async (req, res) => {
  try {
    const hotel = await Hotel.findOne({ owner: req.auth.userId });
    if (!hotel) return res.status(404).json({ success: false, message: "No hotel found" });
    const bookings = await Booking.find({ hotel: hotel._id })
      .populate("room hotel user")
      .sort({ createdAt: -1 });
    const totalBookings = bookings.filter(b => b.status !== "cancelled").length;
    const totalRevenue = bookings.filter(b => b.isPaid).reduce((acc, b) => acc + b.totalPrice, 0);
    res.json({ success: true, dashboardData: { totalBookings, totalRevenue, bookings } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch bookings" });
  }
};

// POST /api/bookings/stripe-payment
export const stripePayment = async (req, res) => {
  try {
    const { bookingId } = req.body;
    const booking = await Booking.findById(bookingId);
    const roomData = await Room.findById(booking.room).populate("hotel");
    const { origin } = req.headers;
    const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripeInstance.checkout.sessions.create({
      line_items: [{
        price_data: {
          currency: "inr",
          product_data: { name: roomData.hotel.name },
          unit_amount: booking.totalPrice * 100,
        },
        quantity: 1,
      }],
      mode: "payment",
      success_url: `${origin}/loader/my-bookings`,
      cancel_url: `${origin}/my-bookings`,
      metadata: { bookingId },
    });
    res.json({ success: true, url: session.url });
  } catch (error) {
    res.status(500).json({ success: false, message: "Payment failed" });
  }
};
