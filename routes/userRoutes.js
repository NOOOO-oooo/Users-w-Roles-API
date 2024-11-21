const userControllers = require("../controllers/userControllers");
const router = require("express").Router();

router.post("/Signup", userControllers.register);
router.post("/Signin", userControllers.signIn);
router.get(
   "/users/current",
   userControllers.ensureAuthenticated,
   userControllers.userAuthenticated
);

router.get(
   "/admin",
   userControllers.ensureAuthenticated,
   userControllers.authorize(["admin"]),
   (req, res) => {
      return res
         .status(200)
         .json({ message: "Only admins can access this routes" });
   }
);

router.get(
   "/mod",
   userControllers.ensureAuthenticated,
   userControllers.authorize(["mod", "admin"]),
   (req, res) => {
      return res.status(200).json({
         message: "Only Admins and moderators can access this routes",
      });
   }
);

router.post("/refreshtoken", userControllers.updateRefreshToken);

router.get(
   "/logout",
   userControllers.ensureAuthenticated,
   userControllers.logoutController
);

module.exports = router;
