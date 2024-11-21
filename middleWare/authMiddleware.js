const jwt = require("jsonwebtoken");

exports.ensureAuthenticated = async (req, res, next) => {
   const accessToken = req.headers.authorization;

   if (!accessToken) {
      return res.status(401).json({ message: "Access Token Not Found" });
   }

   try {
      const decodedAccessToken = jwt.verify(
         accessToken,
         config.accessTokenSecret
      );

      req.user = { id: decodedAccessToken };

      next();
   } catch (error) {
      return res.status(401).json({ error: "Access Token invalid or expired" });
   }
};
