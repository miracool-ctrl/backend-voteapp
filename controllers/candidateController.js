const { v4: uuid } = require("uuid");
const cloudinary = require('../utils/cloudinary');
const mongoose = require("mongoose");

const ElectionModel = require("../models/electionModel");
const CandidateModel = require("../models/candidateModel");
const HttpError = require("../models/ErrorModel");
const VoterModel = require("../models/voterModel");


// ==================================== ADD CANDIDATE
// POST : api/candidates
// Protected
const addCandidate = async (req, res, next) => {
  try {
    if (!req.user.isAdmin) {
      return next(new HttpError("You are not authorized to add a candidate", 403));
    }

    const { fullName, motto, currentElection } = req.body;
    if (!fullName || !motto || !currentElection) {
      return next(new HttpError("Full name, motto and election are required", 422));
    }

    if (!req.files || !req.files.image) {
      return next(new HttpError("Image is required", 422));
    }

    const image = req.files.image;

    if (image.size > 1000000) {
      return next(new HttpError("Image size should be less than 1MB", 422));
    }

    // Upload directly to Cloudinary
    const result = await cloudinary.uploader.upload(image.tempFilePath, {
      resource_type: "image",
    });

    if (!result.secure_url) {
      return next(new HttpError("Failed to upload image to cloudinary", 500));
    }

    // Save candidate
    let newCandidate = new CandidateModel({
      fullName,
      image: result.secure_url,
      motto,
      election: currentElection,
    });

    let election = await ElectionModel.findById(currentElection);
    if (!election) {
      return next(new HttpError("Election not found", 404));
    }

    const sess = await mongoose.startSession();
    sess.startTransaction();
    await newCandidate.save({ session: sess });
    election.candidates.push(newCandidate);
    await election.save({ session: sess });
    await sess.commitTransaction();

    return res.status(201).json({ 
      message: "Candidate added successfully", 
      candidate: newCandidate 
    });

  } catch (error) {
    return next(new HttpError(error.message || "Something went wrong", 500));
  }
};


// ==================================== GET SINGLE CANDIDATE
// GET : api/candidates/:id
const getCandidate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const candidate = await CandidateModel.findById(id);

    if (!candidate) {
      return next(new HttpError("Candidate not found", 404));
    }

    return res.json(candidate);
  } catch (error) {
    return next(new HttpError(error.message || "Failed to fetch candidate", 500));
  }
};


// ==================================== GET CANDIDATES BY ELECTION
// GET : api/elections/:id/candidates
const getCandidatesByElection = async (req, res, next) => {
  try {
    const { id } = req.params;
    const candidates = await CandidateModel.find({ election: id });

    if (!candidates || candidates.length === 0) {
      return res.status(404).json({ message: "No candidates found for this election" });
    }

    return res.json(candidates);
  } catch (error) {
    return next(new HttpError(error.message || "Failed to fetch candidates", 500));
  }
};


// ==================================== DELETE CANDIDATE
// DELETE : api/candidates/:id
// Protected (only admin)
const removeCandidate = async (req, res, next) => {
  try {
    if (!req.user.isAdmin) {
      return next(new HttpError("You are not authorized to remove a candidate", 403));
    }

    const { id } = req.params;
    let currentCandidate = await CandidateModel.findById(id).populate("election");

    if (!currentCandidate) {
      return next(new HttpError("Candidate not found", 404));
    }

    const sess = await mongoose.startSession();
    sess.startTransaction();

    await currentCandidate.deleteOne({ session: sess });
    currentCandidate.election.candidates.pull(currentCandidate);
    await currentCandidate.election.save({ session: sess });

    await sess.commitTransaction();

    return res.status(200).json({ message: "Candidate removed successfully" });

  } catch (error) {
    return next(new HttpError(error.message || "Failed to remove candidate", 500));
  }
};


// ==================================== VOTE FOR CANDIDATE
// POST : api/candidates/:id/vote
// Protected
const voteCandidate = async (req, res, next) => {
  try {
    const { id: candidateId } = req.params;
    const { currentVoterId, selectedElection } = req.body;

    // 1. Candidate check
    const candidate = await CandidateModel.findById(candidateId);
    if (!candidate) {
      return next(new HttpError("Candidate not found", 404));
    }

    // 2. Voter check
    const voter = await VoterModel.findById(currentVoterId);
    if (!voter) {
      return next(new HttpError("Voter not found", 404));
    }

    // 3. Election check
    const election = await ElectionModel.findById(selectedElection);
    if (!election) {
      return next(new HttpError("Election not found", 404));
    }

    // 4. Prevent double voting
    if (voter.votedElections.includes(election._id)) {
      return next(new HttpError("You have already voted in this election", 403));
    }

    // 5. Cast vote
    candidate.voteCount = (candidate.voteCount || 0) + 1;

    const sess = await mongoose.startSession();
    sess.startTransaction();

    await candidate.save({ session: sess });
    election.voters.push(voter._id);
    voter.votedElections.push(election._id);

    await election.save({ session: sess });
    await voter.save({ session: sess });

    await sess.commitTransaction();

    return res.status(200).json(voter.votedElections);

  } catch (error) {
    return next(new HttpError(error.message || "Voting failed", 500));
  }
};


module.exports = { 
  addCandidate, 
  getCandidate, 
  getCandidatesByElection, 
  removeCandidate, 
  voteCandidate 
};
