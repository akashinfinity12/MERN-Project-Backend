const multer = require("multer");
const path = require("path");
const { v1: uuidv1 } = require("uuid");

const MIME_TYPE_MAP = {
  "image/png": "png",
  "image/jpg": "jpg",
  "image/jpeg": "jpeg",
};

const fileUpload = multer({
  limits: 500000,
  storage: multer.diskStorage({
    destination: path.join(__dirname, "uploads/images"),
    filename: (req, file, callBack) => {
      const extension = MIME_TYPE_MAP[file.mimetype];
      callBack(null, uuidv1() + "." + extension);
    },
  }),
  fileFilter: (req, file, callBack) => {
    const isValid = !!MIME_TYPE_MAP[file.mimetype];
    const error = isValid ? null : new Error("Invalid MIME type");
    callBack(error, isValid);
  },
});

module.exports = fileUpload;
