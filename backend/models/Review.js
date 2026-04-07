import mongoose, { Schema } from 'mongoose';

const SellerReplySchema = new Schema(
  {
    comment: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const ReviewSchema = new Schema(
  {
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true },
    renter: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    seller: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    // Optional, additive seller reply that never mutates the original review content
    sellerReply: { type: SellerReplySchema, default: null },
  },
  { timestamps: true },
);

export default mongoose.models.Review || mongoose.model('Review', ReviewSchema);
