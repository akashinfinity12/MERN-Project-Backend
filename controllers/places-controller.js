const HttpError = require("../models/http-error");
const { validationResult } = require("express-validator");
const fs = require("fs");
const Place = require("../models/place");
const User = require("../models/user");
const mongoose = require("mongoose");

const getPlaces = async (req, res, next) => {
  let places;
  try {
    places = await Place.find();
  } catch (error) {
    return next(
      new HttpError("Something went wrong. Could not retrieve places", 500)
    );
  }

  if (!places || places.length === 0)
    return next(new HttpError("No places found", 404));

  res.json({ places });
};

const getPlaceById = async (req, res, next) => {
  const placeId = req.params.pid;

  let place;
  try {
    place = await Place.findById(placeId);
  } catch (error) {
    return next(
      new HttpError("Something went wrong. Could not find a place", 500)
    );
  }

  if (!place) {
    return next(
      new HttpError("Could not find a place with the provided Id", 404)
    );
  }

  res.json({ place });
};

const getPlacesByUserId = async (req, res, next) => {
  const userId = req.params.uid;

  let place;
  try {
    place = await Place.find({ creatorId: userId });
  } catch (error) {
    return next(
      new HttpError("Something went wrong. Could not find a place", 500)
    );
  }

  if (!place || place.length === 0)
    return next(
      new HttpError("Could not find a place with the given user id", 404)
    );
  res.json({ place });
};

const createPlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return next(new HttpError("Invalid request body", 422));

  const { title, description, address } = req.body;

  const createdPlace = new Place({
    title,
    description,
    address,
    image: req.file.filename,
    creatorId: req.userData.userId,
  });

  let user;
  try {
    user = await User.findById(req.userData.userId);
  } catch (error) {
    return next(
      new HttpError("Something went wrong. Could not add a place", 500)
    );
  }

  if (!user)
    return next(
      new HttpError("Could not find a user with the provided Id", 404)
    );

  try {
    const session = await mongoose.startSession();
    session.startTransaction();
    await createdPlace.save({ session: session });
    user.places.push(createdPlace);
    await user.save({ session: session });
    await session.commitTransaction();
  } catch (error) {
    return next(new HttpError("Creating place failed, please try again", 500));
  }

  res.status(201).json({ createdPlace });
};

const updatePlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return next(new HttpError("Invalid request body", 422));

  const { title, description } = req.body;
  const placeId = req.params.pid;

  let place;
  try {
    place = await Place.findById(placeId);
  } catch (error) {
    return next(new HttpError("Could not update the place", 500));
  }

  if (place.creatorId.toString() !== req.userData.userId)
    return next(new HttpError("You are not allowed to edit this place", 401));

  try {
    await Place.updateOne(
      { _id: placeId },
      { title: title, description: description }
    );
  } catch (error) {
    return next(new HttpError("Something went wrong. Could not update.", 500));
  }

  res.json({ message: "updated 1 place" });
};

const deletePlace = async (req, res, next) => {
  const placeId = req.params.pid;

  let place;
  try {
    place = await Place.findById(placeId).populate("creatorId");
  } catch (error) {
    return next(new HttpError("Something went wrong. Could not delete", 500));
  }

  if (!place)
    return next(new HttpError("Could not find a place with the given id", 404));

  if (place.creatorId._id.toString() !== req.userData.userId)
    return next(new HttpError("You are not allowed to delete this place", 401));

  // For Image Cleaning
  const imagePath = place.image;

  try {
    const session = await mongoose.startSession();
    session.startTransaction();
    await Place.deleteOne({ _id: placeId }, { session: session });
    place.creatorId.places.pull(place);
    await place.creatorId.save({ session: session });
    await session.commitTransaction();
  } catch (error) {
    return next(
      new HttpError("Something went wrong. Could not delete place", 500)
    );
  }

  fs.unlink(imagePath, (err) => {
    if (err) console.log(`Couldn't delete file: ${imagePath}`);
  });

  res.json({ message: "deleted 1 place" });
};

exports.getPlaceById = getPlaceById;
exports.getPlacesByUserId = getPlacesByUserId;
exports.createPlace = createPlace;
exports.updatePlace = updatePlace;
exports.deletePlace = deletePlace;
exports.getPlaces = getPlaces;
