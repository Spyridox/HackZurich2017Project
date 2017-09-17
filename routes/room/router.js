/** @module room/router */
'use strict';

/* Imports */
const express = require('express');
const middleware = require('../middleware');
const mongoose = require('mongoose');
const Room = mongoose.model('Room');
const Post = mongoose.model('Post');
const ObjectId = mongoose.Types.ObjectId;

/* Custom Utilities */
const utils = require('../utils.js');
const APIutils = require('../APIutils.js');

/* Create router */
const router = express.Router();

/* Supported methods */
router.all('/', middleware.supportedMethods('GET, OPTIONS, POST'));

/* Room no id, return nothing */
router.get('/', function(req, res, next) {
  var newsArray = [];
  Room.find({}, function(err, rooms) {
    for (let room of rooms) {
      var news = {
        title : room.headline,
        postsCount : room.postsCount,
        lastPost : room.lastPost,
        tags : room.tags,
        id : room._id
      }
      news.description = room.items[0].body_xhtml.replace(/<p>/g, '').replace(/\n/g, '').replace(/<\/p>/g, '').replace(/<p\/>/g, '');
      // news.description = 'FAKE NEWS FOR NOW'
      newsArray.push(news);
    }
    res.status(200).json({
      statusCode: 200,
      message: 'sucessfully retrieved news',
      data: newsArray
    }).end();
  });
});

/* Room id, return that room */
router.get('/:room_id', function(req, res, next) {
  /* If bad ID return */
  if (!ObjectId.isValid(req.params.room_id)) {
    res.sendStatus(400);
  }
  /* Get room  and populate data */
  else if (req.accepts('text/html')) {
    Room.findById(req.params.room_id)
    .populate('posts')
    .exec(function(err, room_data) {
      if (err) {
        res.sendStatus(500);
      }
      else if (room_data) {
        res.render('room', {
          title : "Nepeta",
          roomstring : JSON.stringify(room_data),
        });
      }
      else res.sendStatus(404);
    });
  }
  /* If bad accepts return */
  else {
    res.sendStatus(400);
  }
});

/* utility get to have people related to one room for context */
router.get('/:itemId/people', function(req, res, next){
  if (req.accepts('text/html')){
    APIutils.doPersonEntityRequest(req.params.itemId, function(err, people){
      if (err) {
        res.sendStatus(500);
      } else if(people) {
        let names = APIutils.getEntitiesNames(people);
        res.status(201).json(names);
      } else {
        res.sendStatus(204);
      }
    });
  }
});

/* Room id, post comment to that room*/
router.post('/:room_id', function(req, res, next) {
  var newPost = new Post(req.body);
  if (ObjectId.isValid(req.params.room_id)) {
    // retrieve the room (for statistics)
    Room.findById(req.params.room_id).exec(function(err, room){
      if (err){
        return next(err);
      } else {
        var currentRoom = room;

        // if true then post is a reply to another post
        // add as reply of parent
        if (newPost.parent) 
        {
          Post.findById(parent).exec(function(err, post){
            if (err) return next(err);
            if (!post) {
              res.status(404).json({
                message: "Trying to reply to a non-existent post."
              });
            } else {
              // save new post and augment coutn in room
              newPost.save(function(err, savedChild) {
                if (err) {
                  res.status(400).json({
                    message: "Error saving new post."
                  });
                } else {
                  // now save child into parent
                  post.children.push(saved._id);
                  post.save(function(err, savedParent) {
                    if (err) {
                      res.status(400).json({
                        message: "Could not save Post in parent post."
                      });
                    } else {
                      room.postsCount++;
                      room.save(function(err, savedRoom){
                        res.status(201).json(savedChild);
                      });
                    }
                  });
                }
              });
            }
          });
        } else {
          // no parent. then it's not a reply to another post
          newPost.save(function(err, saved){
            if (err) {
              res.status(400).json({
                message: "Error saving new post."
              });
            } else {
              // post saved in DB, now add it to the room.
                room.posts.push(saved._id);
                room.save(function(err, updatedRoom){
                  if (err){
                    res.status(400).json({
                      message: "Could not save Post in Room. "
                    });
                  } else {
                    res.status(201).json(saved);
                  }
                });
              
            }
          });
        }
      }
    });
    
  }
});

/* Export router for room */
module.exports = router;
