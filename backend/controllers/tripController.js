import mongoose from "mongoose";
import User from "../models/userModel.js";
import tripGroupModel, {
  DEFAULT_TRIP_CATEGORIES,
} from "../models/tripGroupModel.js";
import tripExpenseModel from "../models/tripExpenseModel.js";
import tripInviteModel from "../models/tripInviteModel.js";
import { emitTripUpdateToGroup, emitTripUpdateToUsers } from "../socket.js";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const toMemberResponse = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
});

export async function createTripGroup(req, res) {
  const ownerId = req.user._id;
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res
      .status(400)
      .json({ success: false, message: "Group name is required." });
  }

  try {
    const group = await tripGroupModel.create({
      name: name.trim(),
      ownerId,
      memberIds: [ownerId],
      categories: DEFAULT_TRIP_CATEGORIES,
    });

    emitTripUpdateToUsers([ownerId], {
      type: "group_created",
      groupId: String(group._id),
    });

    return res.status(201).json({ success: true, group });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
}

export async function getMyTripGroups(req, res) {
  const userId = req.user._id;
  try {
    const groupsRaw = await tripGroupModel
      .find({ memberIds: userId })
      .populate("ownerId", "name email")
      .populate("memberIds", "name email")
      .sort({ createdAt: -1 });

    const groups = groupsRaw.map((group) => ({
      ...group.toObject(),
      isOwner: String(group.ownerId?._id) === String(userId),
      categories:
        group.categories && group.categories.length
          ? group.categories
          : DEFAULT_TRIP_CATEGORIES,
    }));

    return res.json({ success: true, groups });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
}

export async function inviteToTripGroup(req, res) {
  const requesterId = req.user._id;
  const { groupId } = req.params;
  const { email } = req.body;

  if (!isValidObjectId(groupId)) {
    return res.status(400).json({ success: false, message: "Invalid group id." });
  }
  if (!email || !email.trim()) {
    return res.status(400).json({ success: false, message: "Email is required." });
  }

  try {
    const group = await tripGroupModel.findById(groupId);
    if (!group) {
      return res
        .status(404)
        .json({ success: false, message: "Trip group not found." });
    }
    if (String(group.ownerId) !== String(requesterId)) {
      return res.status(403).json({
        success: false,
        message: "Only group creator can invite users.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const inviteeUser = await User.findOne(
      { email: normalizedEmail },
      "_id name email",
    );

    if (!inviteeUser) {
      const invite = await tripInviteModel.create({
        groupId,
        inviteeEmail: normalizedEmail,
        inviteeUserId: null,
        requestedBy: requesterId,
        status: "not_found",
        note: "No registered user found with this email.",
        respondedAt: new Date(),
      });

      emitTripUpdateToUsers([requesterId], {
        type: "invite_acknowledgement",
        groupId: String(groupId),
      });
      emitTripUpdateToGroup(groupId, {
        type: "invite_acknowledgement",
      });

      return res.json({
        success: true,
        message: "User not found. Acknowledgement sent to group admin.",
        invite,
      });
    }

    const memberSet = new Set(group.memberIds.map((id) => String(id)));
    if (memberSet.has(String(inviteeUser._id))) {
      return res.json({
        success: true,
        message: "User is already a member of this group.",
        alreadyMember: true,
      });
    }

    const existingPending = await tripInviteModel.findOne({
      groupId,
      inviteeUserId: inviteeUser._id,
      status: "pending",
    });
    if (existingPending) {
      return res.json({
        success: true,
        message: "Invitation request already pending for this user.",
        invite: existingPending,
      });
    }

    const invite = await tripInviteModel.create({
      groupId,
      inviteeEmail: inviteeUser.email,
      inviteeUserId: inviteeUser._id,
      requestedBy: requesterId,
      status: "pending",
      note: "Waiting for user response.",
    });

    emitTripUpdateToUsers([requesterId, inviteeUser._id], {
      type: "invite_created",
      groupId: String(groupId),
    });
    emitTripUpdateToGroup(groupId, { type: "invite_created" });

    return res.json({
      success: true,
      message: "Invitation sent successfully.",
      invite,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
}

export async function getMyPendingTripInvites(req, res) {
  const userId = req.user._id;
  try {
    const invites = await tripInviteModel
      .find({ inviteeUserId: userId, status: "pending" })
      .populate("groupId", "name ownerId")
      .populate("requestedBy", "name email")
      .sort({ createdAt: -1 });
    return res.json({ success: true, invites });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
}

export async function respondToTripInvite(req, res) {
  const userId = req.user._id;
  const { inviteId } = req.params;
  const { action } = req.body;

  if (!isValidObjectId(inviteId)) {
    return res.status(400).json({ success: false, message: "Invalid invite id." });
  }
  if (!["accept", "reject"].includes(action)) {
    return res.status(400).json({
      success: false,
      message: "action must be either accept or reject.",
    });
  }

  try {
    const invite = await tripInviteModel.findById(inviteId);
    if (!invite) {
      return res
        .status(404)
        .json({ success: false, message: "Invitation not found." });
    }
    if (String(invite.inviteeUserId) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to respond to this invite.",
      });
    }
    if (invite.status !== "pending") {
      return res.json({
        success: true,
        message: `Invitation already ${invite.status}.`,
        invite,
      });
    }

    invite.status = action === "accept" ? "accepted" : "rejected";
    invite.respondedAt = new Date();
    invite.note =
      action === "accept" ? "User accepted invitation." : "User rejected invitation.";
    await invite.save();

    if (action === "accept") {
      await tripGroupModel.findByIdAndUpdate(invite.groupId, {
        $addToSet: { memberIds: userId },
      });
    }

    emitTripUpdateToUsers([userId, invite.requestedBy], {
      type: "invite_responded",
      groupId: String(invite.groupId),
    });
    emitTripUpdateToGroup(invite.groupId, { type: "invite_responded" });

    return res.json({
      success: true,
      message: `Invitation ${invite.status}.`,
      invite,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
}

export async function getGroupInviteAcknowledgements(req, res) {
  const requesterId = req.user._id;
  const { groupId } = req.params;

  if (!isValidObjectId(groupId)) {
    return res.status(400).json({ success: false, message: "Invalid group id." });
  }

  try {
    const group = await tripGroupModel.findById(groupId);
    if (!group) {
      return res
        .status(404)
        .json({ success: false, message: "Trip group not found." });
    }
    if (String(group.ownerId) !== String(requesterId)) {
      return res.status(403).json({
        success: false,
        message: "Only group creator can view invite acknowledgements.",
      });
    }

    const invites = await tripInviteModel
      .find({ groupId })
      .populate("inviteeUserId", "name email")
      .populate("requestedBy", "name email")
      .sort({ createdAt: -1 });

    return res.json({ success: true, invites });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
}

export async function addTripGroupCategory(req, res) {
  const requesterId = req.user._id;
  const { groupId } = req.params;
  const { category } = req.body;

  if (!isValidObjectId(groupId)) {
    return res.status(400).json({ success: false, message: "Invalid group id." });
  }
  if (!category || !category.trim()) {
    return res.status(400).json({ success: false, message: "Category is required." });
  }

  try {
    const group = await tripGroupModel.findById(groupId);
    if (!group) {
      return res
        .status(404)
        .json({ success: false, message: "Trip group not found." });
    }
    if (!group.memberIds.map(String).includes(String(requesterId))) {
      return res
        .status(403)
        .json({ success: false, message: "You are not part of this group." });
    }

    const normalized = category.trim();
    await tripGroupModel.findByIdAndUpdate(groupId, {
      $addToSet: { categories: normalized },
    });

    const updated = await tripGroupModel
      .findById(groupId)
      .populate("ownerId", "name email")
      .populate("memberIds", "name email");

    emitTripUpdateToGroup(groupId, { type: "category_added" });
    emitTripUpdateToUsers(updated.memberIds.map((member) => member._id), {
      type: "category_added",
      groupId: String(groupId),
    });

    return res.json({
      success: true,
      message: "Category added to this group.",
      group: updated,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
}

export async function addTripExpense(req, res) {
  const userId = req.user._id;
  const { groupId, description, category, totalAmount, splitUserIds, date } = req.body;

  if (
    !groupId ||
    !description ||
    totalAmount == null ||
    !Array.isArray(splitUserIds) ||
    splitUserIds.length === 0
  ) {
    return res.status(400).json({
      success: false,
      message: "group, description, amount and split members are required.",
    });
  }

  if (!isValidObjectId(groupId)) {
    return res.status(400).json({ success: false, message: "Invalid group id." });
  }

  const uniqueSplitUserIds = [...new Set(splitUserIds)];
  if (uniqueSplitUserIds.some((id) => !isValidObjectId(id))) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid split member id." });
  }

  const parsedAmount = Number(totalAmount);
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    return res
      .status(400)
      .json({ success: false, message: "Total amount must be greater than 0." });
  }

  try {
    const group = await tripGroupModel.findById(groupId);
    if (!group) {
      return res
        .status(404)
        .json({ success: false, message: "Trip group not found." });
    }

    const groupMemberSet = new Set(group.memberIds.map((id) => String(id)));
    if (!groupMemberSet.has(String(userId))) {
      return res
        .status(403)
        .json({ success: false, message: "You are not part of this group." });
    }
    if (uniqueSplitUserIds.some((id) => !groupMemberSet.has(String(id)))) {
      return res.status(400).json({
        success: false,
        message: "All split members must belong to the selected group.",
      });
    }
    if (!category || !category.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Please select expense category." });
    }

    const perHeadRaw = parsedAmount / uniqueSplitUserIds.length;
    const perHead = Number(perHeadRaw.toFixed(2));
    const splitBetween = uniqueSplitUserIds.map((id) => ({
      userId: id,
      amount: perHead,
    }));

    // Handle rounding remainder by adjusting last member share.
    const assignedTotal = Number((perHead * splitBetween.length).toFixed(2));
    const remainder = Number((parsedAmount - assignedTotal).toFixed(2));
    if (remainder !== 0 && splitBetween.length > 0) {
      splitBetween[splitBetween.length - 1].amount = Number(
        (splitBetween[splitBetween.length - 1].amount + remainder).toFixed(2),
      );
    }

    const createdExpense = await tripExpenseModel.create({
      groupId,
      description: description.trim(),
      category: category || "Other",
      totalAmount: parsedAmount,
      paidBy: userId,
      splitBetween,
      date: date ? new Date(date) : new Date(),
      createdBy: userId,
    });

    emitTripUpdateToGroup(groupId, {
      type: "expense_added",
      groupId: String(groupId),
      expenseId: String(createdExpense._id),
    });
    emitTripUpdateToUsers(group.memberIds, {
      type: "expense_added",
      groupId: String(groupId),
      expenseId: String(createdExpense._id),
    });

    return res.status(201).json({ success: true, expense: createdExpense });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
}

export async function getTripExpensesByGroup(req, res) {
  const userId = req.user._id;
  const { groupId } = req.params;

  if (!isValidObjectId(groupId)) {
    return res.status(400).json({ success: false, message: "Invalid group id." });
  }

  try {
    const group = await tripGroupModel.findById(groupId);
    if (!group) {
      return res
        .status(404)
        .json({ success: false, message: "Trip group not found." });
    }

    const memberIds = group.memberIds.map((id) => String(id));
    if (!memberIds.includes(String(userId))) {
      return res
        .status(403)
        .json({ success: false, message: "You are not part of this group." });
    }

    const expenses = await tripExpenseModel
      .find({ groupId })
      .populate("paidBy", "name email")
      .populate("createdBy", "name email")
      .populate("splitBetween.userId", "name email")
      .sort({ date: -1 });

    return res.json({ success: true, expenses });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
}

export async function getTripGroupSettlement(req, res) {
  const userId = String(req.user._id);
  const { groupId } = req.params;

  if (!isValidObjectId(groupId)) {
    return res.status(400).json({ success: false, message: "Invalid group id." });
  }

  try {
    const group = await tripGroupModel
      .findById(groupId)
      .populate("memberIds", "name email");
    if (!group) {
      return res
        .status(404)
        .json({ success: false, message: "Trip group not found." });
    }

    const groupMemberIds = group.memberIds.map((member) => String(member._id));
    if (!groupMemberIds.includes(userId)) {
      return res
        .status(403)
        .json({ success: false, message: "You are not part of this group." });
    }

    const expenses = await tripExpenseModel.find({ groupId });

    const totalPaidMap = {};
    const totalShareMap = {};
    group.memberIds.forEach((member) => {
      const memberId = String(member._id);
      totalPaidMap[memberId] = 0;
      totalShareMap[memberId] = 0;
    });

    const toCents = (value) => Math.round(Number(value || 0) * 100);
    const fromCents = (value) => Number((value / 100).toFixed(2));

    expenses.forEach((expense) => {
      const payerId = String(expense.paidBy);
      const totalCents = toCents(expense.totalAmount);
      if (totalPaidMap[payerId] == null) {
        totalPaidMap[payerId] = 0;
      }
      if (totalShareMap[payerId] == null) {
        totalShareMap[payerId] = 0;
      }
      totalPaidMap[payerId] += totalCents;

      (expense.splitBetween || []).forEach((share) => {
        const shareUserId = String(share.userId);
        const shareCents = toCents(share.amount);
        if (totalPaidMap[shareUserId] == null) {
          totalPaidMap[shareUserId] = 0;
        }
        if (totalShareMap[shareUserId] == null) {
          totalShareMap[shareUserId] = 0;
        }
        totalShareMap[shareUserId] += shareCents;
      });
    });

    const balanceMap = {};
    Object.keys({ ...totalPaidMap, ...totalShareMap }).forEach((memberId) => {
      balanceMap[memberId] = (totalPaidMap[memberId] || 0) - (totalShareMap[memberId] || 0);
    });

    const memberMap = {};
    group.memberIds.forEach((member) => {
      memberMap[String(member._id)] = {
        id: String(member._id),
        name: member.name,
        email: member.email,
      };
    });

    // Build pairwise obligations (from -> to) using all expenses.
    const pairwiseOwe = {};
    const addPairwise = (from, to, amountCents) => {
      const key = `${from}->${to}`;
      pairwiseOwe[key] = (pairwiseOwe[key] || 0) + amountCents;
    };

    expenses.forEach((expense) => {
      const payerId = String(expense.paidBy);
      (expense.splitBetween || []).forEach((share) => {
        const shareUserId = String(share.userId);
        if (shareUserId === payerId) return; // no self-debt
        addPairwise(shareUserId, payerId, toCents(share.amount));
      });
    });

    // Net pairwise debts for each pair to keep expected "A owes B" visibility.
    const memberIds = Object.keys(memberMap);
    const transfers = [];
    for (let i = 0; i < memberIds.length; i += 1) {
      for (let j = i + 1; j < memberIds.length; j += 1) {
        const a = memberIds[i];
        const b = memberIds[j];
        const aToB = pairwiseOwe[`${a}->${b}`] || 0;
        const bToA = pairwiseOwe[`${b}->${a}`] || 0;
        const diff = aToB - bToA;
        if (diff > 0) {
          transfers.push({ from: a, to: b, amount: diff });
        } else if (diff < 0) {
          transfers.push({ from: b, to: a, amount: Math.abs(diff) });
        }
      }
    }

    const transfersWithNames = transfers
      .filter((transfer) => transfer.amount > 0)
      .map((transfer) => ({
      ...transfer,
      amount: fromCents(transfer.amount),
      fromUser: memberMap[transfer.from] || null,
      toUser: memberMap[transfer.to] || null,
      }));

    const youPay = transfersWithNames.filter((transfer) => transfer.from === userId);
    const youReceive = transfersWithNames.filter((transfer) => transfer.to === userId);

    const userNetCents = balanceMap[userId] || 0;
    const totalYouPay = userNetCents < 0 ? fromCents(Math.abs(userNetCents)) : 0;
    const totalYouReceive = userNetCents > 0 ? fromCents(userNetCents) : 0;

    return res.json({
      success: true,
      settlement: {
        groupId: String(group._id),
        groupName: group.name,
        balances: Object.entries(balanceMap).map(([memberId, amountCents]) => ({
          user: memberMap[memberId] || { id: memberId, name: "Unknown", email: "" },
          totalPaid: fromCents(totalPaidMap[memberId] || 0),
          totalShare: fromCents(totalShareMap[memberId] || 0),
          amount: fromCents(amountCents),
        })),
        transfers: transfersWithNames,
        yourSummary: {
          totalYouPay,
          totalYouReceive,
          net: fromCents(userNetCents),
          youPay,
          youReceive,
        },
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
}

export async function deleteTripExpense(req, res) {
  const userId = req.user._id;
  const { expenseId } = req.params;

  if (!isValidObjectId(expenseId)) {
    return res.status(400).json({ success: false, message: "Invalid expense id." });
  }

  try {
    const expense = await tripExpenseModel.findById(expenseId);
    if (!expense) {
      return res
        .status(404)
        .json({ success: false, message: "Trip expense not found." });
    }

    const group = await tripGroupModel.findById(expense.groupId);
    if (!group) {
      return res
        .status(404)
        .json({ success: false, message: "Trip group not found." });
    }

    if (String(group.ownerId) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: "Only group admin can delete group expense history.",
      });
    }

    await tripExpenseModel.findByIdAndDelete(expenseId);

    emitTripUpdateToGroup(expense.groupId, {
      type: "expense_deleted",
      groupId: String(expense.groupId),
      expenseId: String(expenseId),
    });
    emitTripUpdateToUsers(group.memberIds, {
      type: "expense_deleted",
      groupId: String(expense.groupId),
      expenseId: String(expenseId),
    });

    return res.json({ success: true, message: "Trip expense deleted successfully." });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
}
