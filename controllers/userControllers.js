const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const config = require("../config");

//Registery(Signup) and hashing the password, hashed password gets stored in db, also role setting
exports.register = async (req, res) => {
   try {
      //checking if user exists By email
      const existingUser = await prisma.users.findUnique({
         where: {
            email: req.body.email,
         },
      });
      if (existingUser) {
         return res.status(400).json({ error: "User already exists" });
      }
      const password = req.body.password;
      //Validation
      if (password.length < 5) {
         return res.json({ error: "password must be Five or more characters" });
      }

      if (password[0] !== password[0].toUpperCase()) {
         return res
            .status(422)
            .json({ error: "password must start with a capital letter" });
      }

      //Password Hashing

      const hashedPassword = await bcrypt.hash(req.body.password, 10);
      //User Creation
      const createUser = await prisma.users.create({
         data: {
            email: req.body.email,
            //The encrypted password
            password: hashedPassword,
            name: req.body.name,
            role: req.body.role || "member",
         },
      });
      //Sending a message and the info of the user
      return res.status(200).json({
         message: "Account created successfully",
         createUser,
      });
   } catch (error) {
      return res.status(500).json({ error: error.message });
   }
};
//sign in and tokens generation
exports.signIn = async (req, res) => {
   try {
      //Finding a user using a unique identifier, I used an email
      const user = await prisma.users.findUnique({
         where: {
            email: req.body.email,
         },
      });
      //checks if a user exists based on email
      if (!user) {
         return res.status(401).json({ error: "Invalid credentials" });
      }
      //compares the hashed password with the one entered.
      const isPassword = await bcrypt.compare(req.body.password, user.password);
      //if they don't match, tell the user the info you typed is wrong
      if (!isPassword) {
         return res.status(401).json({ error: "Invalid credentials" });
      }
      //if the user info was correct, create an access token

      //we create an access token, it uses a payload, which is data(the id) to identify the user,
      //then it uses a signiture to ensure the token won't be tampered with. That's the accessTokenSecret.
      //Lastly we add options which are optional, I added a subject, and an expiry date.
      const accessToken = await jwt.sign(
         { userId: user.id },
         config.accessTokenSecret,
         { subject: "Signin", expiresIn: "30m" }
      );

      const refreshToken = await jwt.sign(
         {
            userId: user.id,
         },
         config.refreshTokenSecret,
         { subject: "refresh", expiresIn: "1w" }
      );

      const insertToken = await prisma.refresh_tokens.create({
         data: {
            refreshtoken: refreshToken,
            user_id: user.id,
         },
      });

      //get these from the body
      return res.status(200).json({
         id: req.body.id,
         name: req.body.name,
         email: req.body.email,
         accessToken,
         refreshToken,
      });
   } catch (error) {
      return res.status(500).json({ error: error.message });
   }
};

exports.updateRefreshToken = async (req, res) => {
   try {
      const { refreshtoken } = req.body;
      if (!refreshtoken) {
         return res.status(401).json({ message: "Refresh token not found" });
      }
      const decodedRefreshToken = await jwt.verify(
         refreshtoken,
         config.refreshTokenSecret
      );

      const userRefToken = await prisma.refresh_tokens.findUnique({
         where: {
            refreshtoken: refreshtoken,
            user_id: decodedRefreshToken.userId,
         },
      });

      if (!userRefToken) {
         return res
            .status(401)
            .json({ message: "Refresh token invalid or expired" });
      }

      const deleteRefToken = await prisma.refresh_tokens.delete({
         where: {
            refreshtoken: refreshtoken,
            user_id: decodedRefreshToken.userId,
         },
      });

      const newAccessToken = await jwt.sign(
         { userId: decodedRefreshToken.userId },
         config.accessTokenSecret,
         { subject: "Signin", expiresIn: "30m" }
      );

      const newRefreshToken = await jwt.sign(
         {
            userId: decodedRefreshToken.userId,
         },
         config.refreshTokenSecret,
         { subject: "refresh", expiresIn: "1w" }
      );

      const insertToken = await prisma.refresh_tokens.create({
         data: {
            refreshtoken: newRefreshToken,
            user_id: decodedRefreshToken.userId,
         },
      });
      return res.status(200).json({
         newAccessToken,
         newRefreshToken,
      });
   } catch (error) {
      if (
         error instanceof jwt.TokenExpiredError ||
         error instanceof jwt.JsonWebTokenError
      ) {
         return res
            .status(401)
            .json({ message: "Refresh token invalid or expired" });
      }
      return res.status(500).json({ error: error.message });
   }
};
//this outputs info only if the user is authorized after signing in
exports.userAuthenticated = async (req, res) => {
   try {
      //Find a user based on the id*
      const user = await prisma.users.findUnique({
         where: { id: req.user.id },
      });
      return res.status(200).json({
         id: user._id,
         name: user.name,
         email: user.email,
      });
   } catch (error) {
      return res.status(500).json({ error: error.message });
   }
};
//Middleware to check if token is legitimate.
exports.ensureAuthenticated = async (req, res, next) => {
   const accessToken = req.headers.authorization;

   //if access token cannot be found in the header, authorization header, tell them the token is not found
   if (!accessToken) {
      return res.status(401).json({ message: "Access Token Not Found" });
   }

   try {
      //this compares the access token entered with the signiture, our token secret to decode it.
      const decodedAccessToken = jwt.verify(
         accessToken,
         config.accessTokenSecret
      );
      //we made a new request method
      req.user = { id: decodedAccessToken.userId };
      //moving on to the rest of the code, next();
      next();
   } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
         return res.status(401).json({
            error: "Access Token expired",
            code: "AccessTokenExpired",
         });
      } else if (error instanceof jwt.JsonWebTokenError) {
         return res.status(401).json({
            error: "Access Token invalid",
            code: "AccessTokenInvalid",
         });
      } else {
         return res.status(500).json({ error: error.message });
      }
   }
};

exports.authorize = (role = []) => {
   return async (req, res, next) => {
      const user = await prisma.users.findUnique({
         where: {
            id: req.user.id,
         },
      });

      if (!user || !role.includes(user.role)) {
         return res.status(403).json({ message: "User Access denied" });
      }
      next();
   };
};
//access token gets passed, if found, delete it
exports.logoutController = async (req, res) => {
   try {
      const deleteRefTokens = await prisma.refresh_tokens.deleteMany({
         where: {
            userId: req.user._id,
         },
      });
      if (!deleteRefTokens) {
         res.status(401).json({ message: "There are no tokens to delete" });
      }
      return res.status(200).json({ deleteRefTokens, message: "signed out." });
   } catch (error) {
      return res.status(500).json({ error: error.message });
   }
};
