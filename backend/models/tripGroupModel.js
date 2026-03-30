import mongoose from "mongoose";

export const DEFAULT_TRIP_CATEGORIES = ["Food", "Travel", "Hotel", "Other"];

const tripGroupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    memberIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true,
      },
    ],
    categories: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  {
    timestamps: true,
  },
);

tripGroupSchema.pre("save", function applyDefaultCategories(next) {
  if (!this.categories || this.categories.length === 0) {
    this.categories = DEFAULT_TRIP_CATEGORIES;
  }
  next();
});

const tripGroupModel =
  mongoose.models.tripGroup || mongoose.model("tripGroup", tripGroupSchema);

export default tripGroupModel;
