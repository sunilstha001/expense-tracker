import User from '../models/userModel.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

const getUserIdFromTokenPayload = (payload) => {
    if (!payload || typeof payload !== "object") return null;
    return payload.id || payload._id || payload.userId || payload.sub || null;
};

export default async function authMiddleware(req, res, next) {
    // grab the token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            success: false,
            message: "Not authorized or token missing"
        });
    }
    const token = authHeader.split(" ")[1];

    // to verify the token
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        const userId = getUserIdFromTokenPayload(payload);
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Token payload invalid"
            });
        }

        const user = await User.findById(userId).select("-password");
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User not found"
            });
        }
        req.user = user;
        next();
    }

    catch (err) {
        console.error("JWT verification failed:", err);
        return res.status(401).json({
            success: false,
            message: "Token invalid or expired"
        });
    }
}