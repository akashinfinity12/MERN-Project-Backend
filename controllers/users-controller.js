const HttpError = require("../models/http-error");
const { validationResult } = require("express-validator");
const User = require("../models/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const getAllUsers = async (req, res, next) => {
  let users;
  try {
    users = await User.find({}, "-password");
  } catch (error) {
    return next(
      new HttpError("Something went wrong. Could not retrieve users", 500)
    );
  }

  if (!users || users.length === 0)
    return next(new HttpError("No users found", 404));

  res.json({ users });
};

const signup = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return next(new HttpError("Invalid request body", 422));
  const { name, email, password } = req.body;

  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (error) {
    return next(new HttpError("Something went wrong. Could not sign up", 500));
  }

  if (existingUser)
    return next(
      new HttpError("User already exists. Please login instead", 422)
    );

  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (error) {
    return next(
      new HttpError("Could not create user. Please try again later.")
    );
  }

  const createdUser = new User({
    name,
    email,
    image: req.file.filename,
    password: hashedPassword,
    places: [],
  });

  try {
    await createdUser.save();
  } catch (err) {
    return next(new HttpError("Signing up failed, please try again.", 500));
  }

  let token;
  try {
    token = jwt.sign(
      { userId: createdUser.id, email: createdUser.email },
      process.env.TOKENPRIVATEKEY,
      { expiresIn: "1h" }
    );
  } catch (error) {
    return next(new HttpError("Signing up failed, please try again.", 500));
  }

  res.status(201).json({ userId: createdUser.id, token: token });
};

const login = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return next(new HttpError("Invalid request body", 422));

  const { email, password } = req.body;

  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (error) {
    return next(new HttpError("Something went wrong. Could not login", 500));
  }

  if (!existingUser)
    return next(new HttpError("Invalid Credentials. Could not login", 403));

  let isValidPassword = false;
  try {
    isValidPassword = await bcrypt.compare(password, existingUser.password);
  } catch (error) {
    return next(new HttpError("Something went wrong. Could not login", 500));
  }

  if (!isValidPassword)
    return next(new HttpError("Invalid Credentials. Could not login", 403));

  let token;
  try {
    token = jwt.sign(
      { userId: existingUser.id, email: existingUser.email },
      process.env.TOKENPRIVATEKEY,
      { expiresIn: "1h" }
    );
  } catch (error) {
    return next(new HttpError("Logging in failed, please try again.", 500));
  }

  res.json({
    message: "Login Successful",
    userId: existingUser.id,
    token: token,
  });
};

exports.getAllUsers = getAllUsers;
exports.signup = signup;
exports.login = login;
