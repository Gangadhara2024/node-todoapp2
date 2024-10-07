const isAuth = (req, res, next) => {
    if (req.session.isAuth) {
        next();
    }
    else {
        res.status(400).json("session expired login please");
    }
}
module.exports = isAuth;