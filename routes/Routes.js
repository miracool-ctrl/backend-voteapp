const { Router } = require("express");

// Controllers
const {
  registerVoter,
  loginVoter,
  getVoter,
} = require("../controllers/voterController");

const {
  addElection,
  getElections,
  getElection,
  updateElection,
  removeElection,
  getCandidatesOfElection,
  getElectionVoters,
} = require("../controllers/electionController");

const {
  addCandidate,
  getCandidate,
  removeCandidate,
  voteCandidate,
} = require("../controllers/candidateController");

const authMiddleware = require("../middleware/authMiddleware");

const router = Router();

// Voter routes
router.post("/voters/register", registerVoter);
router.post("/voters/login", loginVoter);
router.get("/voters/:id", authMiddleware, getVoter);

// Election routes
router.post("/elections", authMiddleware, addElection);
router.get("/elections", authMiddleware, getElections);
router.get("/elections/:id", authMiddleware, getElection);
router.patch("/elections/:id", authMiddleware, updateElection); 
router.delete("/elections/:id", authMiddleware, removeElection);
router.get("/elections/:id/candidates", authMiddleware, getCandidatesOfElection);
router.get("/elections/:id/voters", authMiddleware, getElectionVoters);

// Candidate routes
router.post("/candidates", authMiddleware, addCandidate);
router.get("/candidates/:id", authMiddleware, getCandidate);
router.delete("/candidates/:id", authMiddleware, removeCandidate);
router.post("/candidates/:id/vote", authMiddleware, voteCandidate);

module.exports = router;
