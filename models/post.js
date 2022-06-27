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
    upvote: {
      type: Number,
      default: 0,
    },

    downvote: {
      type: Number,
      default: 0,
    },
    votedUsers: [
      {
        userId: {
          type: String,
        },
        voteType: {
          type: String
        }
      }
    ],
    creator: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Post', postSchema);
