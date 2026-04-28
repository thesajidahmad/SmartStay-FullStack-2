import User from "../models/User.js";
import { clerkClient } from "@clerk/express";

// Middleware to check if user is authenticated
export const protect = async (req, res, next) => {
  const { userId } = req.auth();
  if (!userId) {
    return res
      .status(401)
      .json({ success: false, message: "not authenticated" });
  }
  let user = await User.findById(userId);
  if (!user) {
    try {
      const clerkUser = await clerkClient.users.getUser(userId);
      user = await User.create({
        _id: userId,
        email: clerkUser.emailAddresses[0].emailAddress,
        username: `${clerkUser.firstName} ${clerkUser.lastName}`.trim(),
        image: clerkUser.imageUrl,
        recentSearchedCities: [],
      });
    } catch (e) {
      return res
        .status(500)
        .json({ success: false, message: "Failed to create user" });
    }
  }
  req.user = user;
  next();
};
