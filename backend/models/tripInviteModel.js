import mongoose from "mongoose";

const tripInviteSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "tripGroup",
      required: true,
    },
    inviteeEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    inviteeUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      default: null,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "not_found"],
      default: "pending",
    },
    note: {
      type: String,
      default: "",
    },
    respondedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

const tripInviteModel =
  mongoose.models.tripInvite || mongoose.model("tripInvite", tripInviteSchema);

export default tripInviteModel;
