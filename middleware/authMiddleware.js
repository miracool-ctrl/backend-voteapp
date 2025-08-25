const jwt = require("jsonwebtoken");
const HttpError = require("../models/ErrorModel");

const authMiddleware = (req, res, next) => {
    const Authorization = req.headers.authorization|| req.headers.Authorization;

    if (Authorization && Authorization.startsWith("Bearer")) {
        const token = Authorization.split(" ")[1];

        jwt.verify(token, process.env.JWT_SECRET, (err, info) => {
            if (err) {
                return next(new HttpError("Not authorized, token failed", 403));
            }
            req.user = info;
            next();
        });

    }else {
        return next(new HttpError("Not authorized, no token", 403));}

}

module.exports = authMiddleware;