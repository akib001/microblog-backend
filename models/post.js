const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const postSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    imageUrl: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    comments: {
      type: Array,
      // default: undefined
    },
    upVote: {
      type: Number,
      default: 0,
    },

    downVote: {
      type: Number,
      default: 0,
    },
    votedUser: {
      type: Array,
    },
    creator: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Post', postSchema);
