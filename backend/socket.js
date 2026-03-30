import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import User from "./models/userModel.js";
import tripGroupModel from "./models/tripGroupModel.js";

let io;

const JWT_SECRET = process.env.JWT_SECRET;

const groupRoom = (groupId) => `trip:group:${String(groupId)}`;
const userRoom = (userId) => `trip:user:${String(userId)}`;

const parseAllowedOrigins = () => {
  const raw = process.env.SOCKET_CORS_ORIGINS || process.env.CLIENT_URL || "*";
  if (raw === "*") return "*";
  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
};

export const initializeSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: parseAllowedOrigins(),
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error("Unauthorized: token missing"));
      }

      const payload = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(payload.id).select("_id");
      if (!user) {
        return next(new Error("Unauthorized: user not found"));
      }

      socket.userId = String(user._id);
      return next();
    } catch (error) {
      return next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(userRoom(socket.userId));

    socket.on("trip:join-group", async ({ groupId } = {}) => {
      if (!groupId) return;
      try {
        const group = await tripGroupModel.findById(groupId).select("memberIds");
        if (!group) return;
        const memberSet = new Set((group.memberIds || []).map((id) => String(id)));
        if (!memberSet.has(socket.userId)) return;

        socket.join(groupRoom(groupId));
      } catch (error) {
        console.log(error);
      }
    });

    socket.on("trip:leave-group", ({ groupId } = {}) => {
      if (!groupId) return;
      socket.leave(groupRoom(groupId));
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO has not been initialized.");
  }
  return io;
};

export const emitTripUpdateToGroup = (groupId, payload = {}) => {
  if (!io || !groupId) return;
  io.to(groupRoom(groupId)).emit("trip:data-updated", {
    groupId: String(groupId),
    ...payload,
    at: Date.now(),
  });
};

export const emitTripUpdateToUsers = (userIds = [], payload = {}) => {
  if (!io || !Array.isArray(userIds)) return;

  [...new Set(userIds.map((id) => String(id)).filter(Boolean))].forEach((userId) => {
    io.to(userRoom(userId)).emit("trip:data-updated", {
      userId,
      ...payload,
      at: Date.now(),
    });
  });
};
