import express from "express";
import authMiddleware from "../middleware/auth.js";
import {
  addTripGroupCategory,
  addTripExpense,
  createTripGroup,
  deleteTripExpense,
  getGroupInviteAcknowledgements,
  getTripGroupSettlement,
  getMyPendingTripInvites,
  getMyTripGroups,
  getTripExpensesByGroup,
  inviteToTripGroup,
  respondToTripInvite,
} from "../controllers/tripController.js";

const tripRouter = express.Router();

tripRouter.post("/groups", authMiddleware, createTripGroup);
tripRouter.get("/groups", authMiddleware, getMyTripGroups);
tripRouter.post("/groups/:groupId/categories", authMiddleware, addTripGroupCategory);
tripRouter.post("/groups/:groupId/invite", authMiddleware, inviteToTripGroup);
tripRouter.get(
  "/groups/:groupId/invites",
  authMiddleware,
  getGroupInviteAcknowledgements,
);
tripRouter.get("/groups/:groupId/expenses", authMiddleware, getTripExpensesByGroup);
tripRouter.get("/groups/:groupId/settlement", authMiddleware, getTripGroupSettlement);
tripRouter.post("/expenses", authMiddleware, addTripExpense);
tripRouter.delete("/expenses/:expenseId", authMiddleware, deleteTripExpense);
tripRouter.get("/invites/me", authMiddleware, getMyPendingTripInvites);
tripRouter.post("/invites/:inviteId/respond", authMiddleware, respondToTripInvite);

export default tripRouter;
