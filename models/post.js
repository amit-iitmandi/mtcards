const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;

const postSchema = new mongoose.Schema({
  image: {
    type: Array,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  type1: {
    type: String,
    required: true,
  },
  type2: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: false,
  },
  cPrice: {
    type: String,
    required: true,
  },
  sPrice: {
    type: String,
    required: true,
  },
  stock: {
    type: Number,
    required: true,
  },
  postedBy: {
    type: ObjectId,
    ref: "User",
  },
});

mongoose.model("Post", postSchema);
