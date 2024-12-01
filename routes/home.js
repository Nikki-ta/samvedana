const express = require("express");
const router = express.Router();

router.get("/", (req,res) => {
	res.render("home");
});

// router.get("/home/mission", (req,res) => {
// 	res.render("home/mission", { title: "Our mission | Food Aid" });
// });

// router.get("/home/contact-us", (req,res) => {
// 	res.render("home/contactUs", { title: "Contact us | Food Aid" });
// });


module.exports = router;