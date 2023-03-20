const jwt = require("jsonwebtoken");
const HttpError = require("../models/http-error");

module.exports = (req, res, next) => {
  if (req.method == "OPTIONS") return next();

  let token;
  try {
    token = req.headers.authorization.split(" ")[1];
    if (!token) return next(new HttpError("Authentication failed", 403));
    const decodedToken = jwt.verify(token, process.env.TOKENPRIVATEKEY);
    req.userData = { userId: decodedToken.userId };
    next();
  } catch (error) {
    return next(new HttpError("Authentication failed", 401));
  }
};
