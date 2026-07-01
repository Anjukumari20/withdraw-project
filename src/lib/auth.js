import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

export function signToken(userId) {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}
