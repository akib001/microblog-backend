const fs = require('fs');
const path = require('path');

const { validationResult } = require('express-validator/check');

const Post = require('../models/post');
const User = require('../models/user');

exports.getPosts = (req, res, next) => {
  const currentPage = req.query.page || 1;
  const perPage = 2;
  let totalItems;
  Post.find()
    .countDocuments()
    .then((count) => {
      totalItems = count;
      return Post.find()
        .skip((currentPage - 1) * perPage)
        .limit(perPage);
    })
    .then((posts) => {
      res.status(200).json({
        message: 'Fetched posts successfully.',
        posts: posts,
        totalItems: totalItems,
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.createPost = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed, entered data is incorrect.');
    error.statusCode = 422;
    throw error;
  }
  if (!req.file) {
    const error = new Error('No image provided.');
    error.statusCode = 422;
    throw error;
  }
  const imageUrl = req.file.path.replace(/\\/g, '/');
  const title = req.body.title;
  const content = req.body.content;
  let creator;
  const post = new Post({
    title: title,
    content: content,
    imageUrl: imageUrl,
    creator: req.userId,
  });
  post
    .save()
    .then((result) => {
      return User.findById(req.userId);
    })
    .then((user) => {
      creator = user;
      user.posts.push(post);
      return user.save();
    })
    .then((result) => {
      res.status(201).json({
        message: 'Post created successfully!',
        post: post,
        creator: { _id: creator._id, name: creator.name },
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.getPost = (req, res, next) => {
  const postId = req.params.postId;
  Post.findById(postId)
    .then((post) => {
      if (!post) {
        const error = new Error('Could not find post.');
        error.statusCode = 404;
        throw error;
      }
      res.status(200).json({ message: 'Post fetched.', post: post });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.updatePost = (req, res, next) => {
  const postId = req.params.postId;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed, entered data is incorrect.');
    error.statusCode = 422;
    throw error;
  }
  const title = req.body.title;
  const content = req.body.content;
  let imageUrl = req.body.image;

  if (req.file) {
    imageUrl = req.file.path;
  }

  if (!imageUrl) {
    const error = new Error('No file picked.');
    error.statusCode = 422;
    throw error;
  }

  Post.findById(postId)
    .then((post) => {
      if (!post) {
        const error = new Error('Could not find post.');
        error.statusCode = 404;
        throw error;
      }
      if (post.creator.toString() !== req.userId) {
        const error = new Error('Not authorized!');
        error.statusCode = 403;
        throw error;
      }
      if (imageUrl !== post.imageUrl) {
        clearImage(post.imageUrl);
      }
      post.title = title;
      post.imageUrl = imageUrl;
      post.content = content;
      return post.save();
    })
    .then((result) => {
      res.status(200).json({ message: 'Post updated!', post: result });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.deletePost = (req, res, next) => {
  const postId = req.params.postId;
  Post.findById(postId)
    .then((post) => {
      if (!post) {
        const error = new Error('Could not find post.');
        error.statusCode = 404;
        throw error;
      }
      if (post.creator.toString() !== req.userId) {
        const error = new Error('Not authorized!');
        error.statusCode = 403;
        throw error;
      }
      // Check logged in user
      clearImage(post.imageUrl);
      return Post.findByIdAndRemove(postId);
    })
    .then((result) => {
      return User.findById(req.userId);
    })
    .then((user) => {
      user.posts.pull(postId);
      return user.save();
    })
    .then((result) => {
      res.status(200).json({ message: 'Deleted post.' });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.postComment = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed, entered data is incorrect.');
    error.statusCode = 422;
    throw error;
  }

  const postId = req.body.postId;
  const comment = req.body.comment;

  console.log(comment);

  Post.findById(postId)
    .then((post) => {
      if (!post) {
        const error = new Error('Could not find post.');
        error.statusCode = 404;
        throw error;
      }
      if (post.creator.toString() !== req.userId) {
        const error = new Error('Not authorized!');
        error.statusCode = 403;
        throw error;
      }
      // if (imageUrl !== post.imageUrl) {
      //   clearImage(post.imageUrl);
      // }
      post.comments.push(comment);
      return post.save();
    })
    .then((result) => {
      res.status(200).json({ message: 'Comment Added!', post: result });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.upvotePost = async (req, res, next) => {
  const postId = req.body.postId;
  const userId = req.userId;
  const errors = validationResult(req);
  let voteResult;

  if (!errors.isEmpty()) {
    const error = new Error('Validation failed, entered data is incorrect.');
    error.statusCode = 422;
    throw error;
  }

  try {
    const post = await Post.findById(postId);
    if (!post) {
      const error = new Error('Could not find post.');
      error.statusCode = 404;
      throw error;
    }

    let votedUser;

    post.votedUsers.forEach(element => {
      if(element.userId === userId) {
        votedUser = userId;
        return;
      } 
      
    });

    // if user has a vote
    if (votedUser) {
      const downvoteExist = await Post.findOne({
        votedUsers: { $elemMatch: { userId: userId, voteType: 'upvote' }},
      }).select('votedUsers');

      // if User Already has upvote
      if (downvoteExist) {
        // const error = new Error('User Already has up vote');
        // error.statusCode = 422;
        // throw error;

        voteResult = await Post.findByIdAndUpdate(
          postId,
          { $pull: { votedUsers: { userId: userId, voteType: 'upvote'}}, $inc: { upvote: -1 }},
          {new: true}
        );
        return res.status(200).json({ message: 'vote removed', voteResult, upvote: voteResult.upvote, downvote: voteResult.downvote, voteRemove: true});
      } else {
        // user has downvote. so we change votetype to upvote and increment upvote count and decrement downvote count
        voteResult = await Post.findOneAndUpdate(
          { votedUsers: { $elemMatch: { userId: userId } } },
          { $set: { 'votedUsers.$.voteType': 'upvote' }, $inc: { upvote: 1, downvote: -1 }},
          {new: true}
        );
      }
    } else {
      // user doesn't have a vote
      voteResult = await Post.findByIdAndUpdate(
        postId,
        { $push: { votedUsers: { userId: userId, voteType: 'upvote'}}, $inc: { upvote: 1 }},
        {new: true}
      );
    }
     res.status(200).json({ message: 'vote updated', voteResult, upvote: voteResult.upvote, downvote: voteResult.downvote, voteRemove: false});
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};


exports.downvotePost = async (req, res, next) => {
  const postId = req.body.postId;
  const userId = req.userId;
  const errors = validationResult(req);
  let voteResult;

  if (!errors.isEmpty()) {
    const error = new Error('Validation failed, entered data is incorrect.');
    error.statusCode = 422;
    throw error;
  }

  try {
    const post = await Post.findById(postId);
    if (!post) {
      const error = new Error('Could not find post.');
      error.statusCode = 404;
      throw error;
    }

    let votedUser;

    post.votedUsers.forEach(element => {
      if(element.userId === userId) {
        votedUser = userId;
        return;
      } 
      
    });

    // if user has a vote
    if (votedUser) {
      const downvoteExist = await Post.findOne({
        votedUsers: { $elemMatch: { userId: userId, voteType: 'downvote' }},
      }).select('votedUsers');

      // if User Already has upvote
      if (downvoteExist) {
        voteResult = await Post.findByIdAndUpdate(
          postId,
          { $pull: { votedUsers: { userId: userId, voteType: 'downvote'}}, $inc: { downvote: -1 }},
          {new: true}
        );
        return res.status(200).json({ message: 'downvote removed', voteResult, upvote: voteResult.upvote, downvote: voteResult.downvote, voteRemove: true});
      } else {
        // user has upvote. so we change votetype to downvote and increment downvote count and decrement upvote count
        voteResult = await Post.findOneAndUpdate(
          { votedUsers: { $elemMatch: { userId: userId } } },
          { $set: { 'votedUsers.$.voteType': 'downvote' }, $inc: { upvote: -1, downvote: 1 }},
          {new: true}
        );
      }
    } else {
      // user doesn't have a vote
      voteResult = await Post.findByIdAndUpdate(
        postId,
        { $push: { votedUsers: { userId: userId, voteType: 'downvote'}}, $inc: { downvote: 1 }},
        {new: true}
      );
    }
     res.status(200).json({ message: 'vote updated', voteResult, upvote: voteResult.upvote, downvote: voteResult.downvote, voteRemove: false});
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};


// exports.downvotePost = async (req, res, next) => {
//   const postId = req.body.postId;
//   const userId = req.userId;
//   const errors = validationResult(req);
//   let voteResult;

//   if (!errors.isEmpty()) {
//     const error = new Error('Validation failed, entered data is incorrect.');
//     error.statusCode = 422;
//     throw error;
//   }

//   try {
//     const post = await Post.findById(postId);
//     if (!post) {
//       const error = new Error('Could not find post.');
//       error.statusCode = 404;
//       throw error;
//     }

//     let votedUser;

//     post.votedUsers.forEach(element => {
//       if(element.userId === userId) {
//         votedUser = userId;
//         return;
//       } 
//     });

//     // if user has a vote
//     if (votedUser) {
//       const downvoteExist = await Post.findOne({
//         votedUsers: { $elemMatch: { userId: userId, voteType: 'downvote' } },
//       }).select('votedUsers');

//       // if User Already has downvote
//       if (downvoteExist) {
//         const error = new Error('User Already has downvote');
//         error.statusCode = 422;
//         throw error;
//       } else {
//         // user has upvote. so we change votetype to downvote and increment downvote count and decrement upvote count
//         voteResult = await Post.findOneAndUpdate(
//           { votedUsers: { $elemMatch: { userId: userId } } },
//           { $set: { 'votedUsers.$.voteType': 'downvote' }, $inc: { upvote: -1, downvote: 1 }},
//           {new: true}
//         );
//       }
//     } else {
//       // user doesn't have a vote
//       voteResult = await Post.findByIdAndUpdate(
//         postId,
//         { $push: { votedUsers: { userId: userId, voteType: 'downvote'}}, $inc: { downvote: 1 }},
//         {new: true}
//       );
//     }
//     res.status(200).json({ message: 'vote updated', voteResult, upvote: voteResult.upvote, downvote: voteResult.downvote});
//   } catch (err) {
//     if (!err.statusCode) {
//       err.statusCode = 500;
//     }
//     next(err);
//   }
// };

const clearImage = (filePath) => {
  filePath = path.join(__dirname, '..', filePath);
  fs.unlink(filePath, (err) => console.log(err));
};
