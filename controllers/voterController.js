const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');


const HttpError = require('../models/ErrorModel');
const VoterModel = require('../models/voterModel');





// ===========================REGISTER NEW VOTER
//POST : api/voters/register
//UNPROTECTED
const registerVoter = async (req, res, next) => {
  try {
    const { fullName, email, password, password2 } = req.body;
    if (!fullName || !email || !password || !password2) {
      return next(new HttpError("Please fill all the fields", 422));
    }
    // make all emails lowercase
    const newEmail = email.toLowerCase();
    // check if the email already exists in the database
    const emailExists = await VoterModel.findOne({ email: newEmail });
    if (emailExists) {
      return next(new HttpError("Email already exists, please use a different email", 422));
    }
    // make sure passwords is 6+ characters
    if ((password.trim().length) < 6) {
      return next(new HttpError("Password must be at least 6 characters", 422));
    }
    // make sure both passwords match
    if (password !== password2) {
      return next(new HttpError("Passwords do not match", 422));
    }
    // hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    //No user or voter should be admin except for one with email "miracool2017@gmail.com"
    let isAdmin = false;
    if (newEmail == "miracool2017@gmail.com") {
      isAdmin = true;
    }
    //save new voter to the database
    const newVoter = await VoterModel.create({
      fullName,
      email: newEmail,
      password: hashedPassword,
      isAdmin
    });
    // send response
    res.status(201).json(`New voter ${fullName} registered successfully!`);


  } catch (error) {
    return next(new HttpError("Registration failed, please try again later.", 422));
  }
}











//function to generate a token for the voter
const generateToken = (payload) => {
  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '1d'
  });
  return token;
}






// ===========================LOGIN VOTER
//POST : api/voters/LOGIN
//UNPROTECTED
const loginVoter = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return next(new HttpError("Please fill all the fields", 422));
    }
    const newEmail = email.toLowerCase();
    // check if the email exists in the database
    const voter = await VoterModel.findOne({ email: newEmail });
    if (!voter) {
      return next(new HttpError("Invalid credentials.", 422));
    }
    //compare the password with the hashed password in the database
    const comparePass = await bcrypt.compare(password, voter.password);
    if (!comparePass) {
      return next(new HttpError("Invalid credentials.", 422));
    }
    const { _id: id, isAdmin, votedElections } = voter;
    const token = generateToken({ id, isAdmin });
    // send response
    res.json({ token, id, votedElections, isAdmin });


  } catch (error) {
    return next(new HttpError("Login failed, please try again later.", 422));
  }
};

// ===========================GET VOTER
//GET : api/voters/:id
//PROTECTED  
const getVoter = async (req, res, next) => {
  const { id } = req.params;
  try {
    const { id } = req.params;
    const voter = await VoterModel.findById(id).select("-password");
    res.json(voter);


  } catch (error) {
    return next(new HttpError("Failed to retrieve voter, please try again later.", 404));
  }
}

module.exports = { registerVoter, loginVoter, getVoter };
