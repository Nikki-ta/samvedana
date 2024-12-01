const express = require("express");
const router = express.Router();

router.get("/blogs/blog1", (req,res) => {
	res.render("blog1");
});

router.get("/blogs/blog2", (req,res) => {
	res.render("blog2");
});
router.get("/blogs/blog3", (req,res) => {
	res.render("blog3");
});

module.exports = router;