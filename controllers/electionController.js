const { v4: uuid } = require("uuid");
const cloudinary = require("../utils/cloudinary");
const Path = require("path");

const ElectionModel = require("../models/electionModel");
const CandidateModel = require("../models/candidateModel");
const HttpError = require("../models/ErrorModel");
const fs = require("fs");

// =========================== ADD NEW ELECTION
const addElection = async (req, res, next) => {
  try {
    if (!req.user.isAdmin) {
      return next(new HttpError("You are not authorized to add an election", 403));
    }

    const { title, description } = req.body;
    if (!title || !description) {
      return next(new HttpError("Title and description are required", 400));
    }

    if (!req.files?.thumbnail) {
      return next(new HttpError("Thumbnail is required", 400));
    }

    const thumbnail = req.files.thumbnail;
    if (thumbnail.size > 1000000) {
      return next(new HttpError("Thumbnail size should be less than 1MB", 400));
    }

    let fileName = thumbnail.name.split(" ").join("_");
    fileName = `${uuid()}_${fileName}`;
    const filePath = Path.join(__dirname, "../uploads", fileName);

    // Save locally then upload to Cloudinary
    await thumbnail.mv(filePath);
    const result = await cloudinary.uploader.upload(filePath, { resource_type: "image" });

    // delete local file after upload
    fs.unlinkSync(filePath);

    const newElection = await ElectionModel.create({
      title,
      description,
      thumbnail: result.secure_url,
    });

    return res.status(201).json(newElection);
  } catch (error) {
    return next(new HttpError(error.message || "Server error", 500));
  }
};

// =========================== GET ALL ELECTIONS
const getElections = async (req, res, next) => {
  try {
    const elections = await ElectionModel.find();
    return res.status(200).json(elections);
  } catch (error) {
    return next(new HttpError(error.message, 500));
  }
};

// =========================== GET SINGLE ELECTION
const getElection = async (req, res, next) => {
  try {
    const { id } = req.params;
    const election = await ElectionModel.findById(id);
    return res.status(200).json(election);
  } catch (error) {
    return next(new HttpError(error.message, 500));
  }
};

// =========================== GET CANDIDATES OF ELECTION
const getCandidatesOfElection = async (req, res, next) => {
  try {
    const { id } = req.params;
    const candidates = await CandidateModel.find({ election: id });
    return res.status(200).json(candidates);
  } catch (error) {
    return next(new HttpError(error.message, 500));
  }
};

// =========================== GET VOTERS OF ELECTION
const getElectionVoters = async (req, res, next) => {
  try {
    const { id } = req.params;
    const response = await ElectionModel.findById(id).populate("voters");
    return res.status(200).json(response.voters);
  } catch (error) {
    return next(new HttpError(error.message, 500));
  }
};

// =========================== UPDATE ELECTION
const updateElection = async (req, res, next) => {
  try {
    if (!req.user.isAdmin) {
      return next(new HttpError("You are not authorized to update an election", 403));
    }

    const { id } = req.params;
    const { title, description } = req.body;

    if (!title || !description) {
      return next(new HttpError("Title and description are required", 422));
    }

    let updateData = { title, description };

    if (req.files?.thumbnail) {
      const thumbnail = req.files.thumbnail;
      if (thumbnail.size > 1000000) {
        return next(new HttpError("Thumbnail size should be less than 1MB", 400));
      }

      let fileName = thumbnail.name.split(" ").join("_");
      fileName = `${uuid()}_${fileName}`;
      const filePath = Path.join(__dirname, "../uploads", fileName);

      await thumbnail.mv(filePath);
      const result = await cloudinary.uploader.upload(filePath, { resource_type: "image" });
      fs.unlinkSync(filePath);

      updateData.thumbnail = result.secure_url;
    }

    await ElectionModel.findByIdAndUpdate(id, updateData);
    return res.status(200).json({ message: "Election updated successfully" });
  } catch (error) {
    return next(new HttpError(error.message, 500));
  }
};

// =========================== DELETE ELECTION
const removeElection = async (req, res, next) => {
  try {
    if (!req.user.isAdmin) {
      return next(new HttpError("You are not authorized to delete an election", 403));
    }

    const { id } = req.params;
    await ElectionModel.findByIdAndDelete(id);
    await CandidateModel.deleteMany({ election: id });

    return res.status(200).json({ message: "Election deleted successfully" });
  } catch (error) {
    return next(new HttpError(error.message, 500));
  }
};

module.exports = {
  addElection,
  getElections,
  getElection,
  updateElection,
  removeElection,
  getCandidatesOfElection,
  getElectionVoters,
};
