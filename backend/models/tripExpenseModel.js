import mongoose from "mongoose";

const tripExpenseSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "tripGroup",
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      default: "Other",
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    splitBetween: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "user",
          required: true,
        },
        amount: {
          type: Number,
          required: true,
        },
      },
    ],
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

const tripExpenseModel =
  mongoose.models.tripExpense ||
  mongoose.model("tripExpense", tripExpenseSchema);

export default tripExpenseModel;
