import { cookies } from "next/headers";
import { verifyToken } from "./auth";
import { connectDB } from "./db";
import User from "@/models/User";

/**
 * Reads the "token" cookie, verifies it, and returns the matching User document.
 * Returns null if there's no valid session.
 */
export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) return null;

  const decoded = verifyToken(token);
  if (!decoded) return null;

  await connectDB();
  const user = await User.findById(decoded.id).select("-password");
  return user;
}
