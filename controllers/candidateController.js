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
// ==================================== DELETE CANDIDATE
// DELETE : api/candidates/:id
// Protected (only admin)
const removeCandidate = async (req, res, next) => {
  let sess;
  try {
    if (!req.user.isAdmin) {
      return next(new HttpError("You are not authorized to remove a candidate", 403));
    }

    const { id } = req.params;
    console.log("Attempting to delete candidate with ID:", id);
    
    // Find the candidate and populate the election
    const currentCandidate = await CandidateModel.findById(id).populate("election");
    
    if (!currentCandidate) {
      console.log("Candidate not found");
      return next(new HttpError("Candidate not found", 404));
    }

    console.log("Found candidate:", currentCandidate.fullName);
    console.log("Associated election:", currentCandidate.election._id);

    // Start session and transaction
    sess = await mongoose.startSession();
    sess.startTransaction();

    // Remove candidate from the election's candidates array first
    currentCandidate.election.candidates.pull(id);
    await currentCandidate.election.save({ session: sess });

    // Then delete the candidate
    await CandidateModel.findByIdAndDelete(id, { session: sess });

    // Commit the transaction
    await sess.commitTransaction();
    console.log("Candidate deleted successfully");
    
    return res.status(200).json({ message: "Candidate removed successfully" });

  } catch (error) {
    // Abort transaction if it was started
    if (sess && sess.inTransaction()) {
      await sess.abortTransaction();
    }
    console.error("Error in removeCandidate:", error);
    return next(new HttpError(error.message || "Failed to remove candidate", 500));
  } finally {
    // End session if it was created
    if (sess) {
      await sess.endSession();
    }
  }
};

// ==================================== VOTE FOR CANDIDATE
// POST : api/candidates/:id/vote
// Protected
// ==================================== VOTE FOR CANDIDATE
// POST : api/candidates/:id/vote
// Protected
const voteCandidate = async (req, res, next) => {
  try {
    const { id: candidateId } = req.params;
    const { currentVoterId, selectedElection } = req.body;

    console.log('VOTE REQUEST:', {
      candidateId,
      currentVoterId,
      selectedElection,
      body: req.body
    });

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
    
    // FIXED: Only update voter's votedElections, not election.voters
    voter.votedElections.push(election._id);
    await voter.save({ session: sess });

    await sess.commitTransaction();

    console.log('VOTE SUCCESSFUL:', {
      candidateVotes: candidate.voteCount,
      voterElections: voter.votedElections
    });

    return res.status(200).json(voter.votedElections);

  } catch (error) {
    console.error('VOTE ERROR:', error);
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
