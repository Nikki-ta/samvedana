const express = require("express");
const router = express.Router();
const middleware = require("../middleware/index.js");
const User = require("../models/user.js");
const Donation = require("../models/donation.js");
const PDFDocument = require('pdfkit'); // For PDF generation
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const ejs = require('ejs');
const getCoordinates = require("../Utils/geocode.js");

router.get("/agent/dashboard", middleware.ensureAgentLoggedIn, async (req,res) => {
	const agentId = req.user._id;
	const numAssignedDonations = await Donation.countDocuments({ agent: agentId, status: "assigned" });
	const numCollectedDonations = await Donation.countDocuments({ agent: agentId, status: "collected" });
	const numRejectedDonations = await Donation.countDocuments({ agent: agentId, status: "rejected" });
	res.render("agent/dashboard", {
		title: "Dashboard",
		numAssignedDonations, numCollectedDonations, numRejectedDonations
	});
});

router.get("/agent/collections/pending", middleware.ensureAgentLoggedIn, async (req,res) => {
	try
	{
		const pendingCollections = await Donation.find({ agent: req.user._id, status: "assigned" }).populate("donor");
		res.render("agent/pendingCollections", { title: "Pending Collections", pendingCollections });
	}
	catch(err)
	{
		console.log(err);
		req.flash("error", "Some error occurred on the server.")
		res.redirect("back");
	}
});

router.get("/agent/collections/previous", middleware.ensureAgentLoggedIn, async (req,res) => {
	try
	{
		const previousCollections = await Donation.find({ agent: req.user._id, status: "collected" }).populate("donor");
		res.render("agent/previousCollections", { title: "Previous Collections", previousCollections });
	}
	catch(err)
	{
		console.log(err);
		req.flash("error", "Some error occurred on the server.")
		res.redirect("back");
	}
});

router.get("/agent/collection/view/:collectionId", middleware.ensureAgentLoggedIn, async (req,res) => {
	try
	{
		const collectionId = req.params.collectionId;
		const collection = await Donation.findById(collectionId).populate("donor");
		res.render("agent/collection", { title: "Collection details", collection });
	}
	catch(err)
	{
		console.log(err);
		req.flash("error", "Some error occurred on the server.")
		res.redirect("back");
	}
});

router.post("/agent/collection/collect/:collectionId", middleware.ensureAgentLoggedIn, async (req, res) => {
    try {
        const collectionId = req.params.collectionId;

        // Update the collection status
        const updatedCollection = await Donation.findByIdAndUpdate(collectionId, 
            { status: "collected", collectionTime: Date.now() },
            { new: true }
        ).populate('donor agent'); // Assuming donorId and agentId are references in the Donation schema

        if (!updatedCollection) {
            req.flash("error", "Collection not found");
            return res.redirect("back");
        }

        const donorEmail = updatedCollection.donor.email; // Fetch donor email
        const agentEmail = updatedCollection.agent.email; // Fetch agent email

        // Generate PDF
		const formData = req.body;
        const pdfPath = `./public/pdfs/collection_${collectionId}.pdf`;
        const doc = new PDFDocument();
        doc.pipe(fs.createWriteStream(pdfPath));
        doc.fontSize(16).text('Collection Details', { align: 'center' });
        doc.moveDown();
		const writeStream = fs.createWriteStream(pdfPath);
    doc.pipe(writeStream);

    // Add content to the PDF
    // doc.fontSize(16).text('Food Collection Checklist', { align: 'center' });
    doc.moveDown();

    Object.keys(formData).forEach((key) => {
        doc.fontSize(12).text(`${key}: ${formData[key]}`);
        doc.moveDown(0.5);
    });
        doc.text(`Collection ID: ${collectionId}`);
        doc.text(`Donor: ${updatedCollection.donor.firstName}`);
        doc.text(`Agent: ${updatedCollection.agent.firstName}`);
        doc.text(`Status: Collected`);
		doc.text('Donor is not liable for the food now!!');
        doc.text(`Collection Time: ${new Date(updatedCollection.collectionTime).toLocaleString()}`);
        doc.end();

        // Email setup
        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
    port: 465,
    secure: true, // true for port 465, false for other ports
            auth: {
                user: process.env.EMAIL_USER, // Your email
                pass: process.env.EMAIL_PASS  // Your email password or app password
            }
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: [donorEmail, agentEmail],
            subject: 'Donation Collection Details',
            text: 'Please find the attached PDF for the collection details.',
            attachments: [
                {
                    filename: `collection_${collectionId}.pdf`,
                    path: pdfPath
                }
            ]
        };

        await transporter.sendMail(mailOptions);

        req.flash("success", "Donation collected successfully and emails sent");
        res.redirect(`/agent/collection/view/${collectionId}`);
    } catch (err) {
        console.error(err);
        req.flash("error", "Some error occurred on the server.");
        res.redirect("back");
    }
});



router.get("/agent/profile", middleware.ensureAgentLoggedIn, (req,res) => {
	res.render("agent/profile", { title: "My Profile" });
});

// router.put("/agent/profile", middleware.ensureAgentLoggedIn, async (req,res) => {
// 	try
// 	{
// 		const id = req.user._id;
// 		const updateObj = req.body.agent;	// updateObj: {firstName, lastName, gender, address, phone}
// 		await User.findByIdAndUpdate(id, updateObj);
		
// 		req.flash("success", "Profile updated successfully");
// 		res.redirect("/agent/profile");
// 	}
// 	catch(err)
// 	{
// 		console.log(err);
// 		req.flash("error", "Some error occurred on the server.")
// 		res.redirect("back");
// 	}
	
// });

router.put("/agent/profile", middleware.ensureAgentLoggedIn, middleware.ensureAgentVerified, async (req, res) => {
	try {
	  const agentId = req.user._id;
	  const updateObj = req.body.agent; // Expecting {firstName, lastName, gender, address, city, state, pincode, phone}
  
	  const { city, state } = updateObj;
  
	  // Geocode the city and state to get latitude and longitude
	  const fullAddress = `${city}, ${state}`;
	  const { latitude, longitude } = await getCoordinates(fullAddress);
  
	  // Assign coordinates to update object as a GeoJSON Point
	  updateObj.location = {
		type: "Point",
		coordinates: [longitude, latitude],
	  };
  
	  // Update the agent's profile in the database
	  await User.findByIdAndUpdate(agentId, updateObj);
  
	  req.flash("success", "Profile updated successfully with location.");
	  res.redirect("/agent/profile");
	} catch (err) {
	  console.error("Error updating agent profile:", err);
	  req.flash("error", "Some error occurred on the server.");
	  res.redirect("back");
	}
  });

// router.get("/agent/listedFood", middleware.ensureAgentLoggedIn, async (req, res) => {
//     try {
//         const agentId = req.user._id; // Get the agent's ID

//         // Fetch donations that are either pending or accepted but only if the current agent is the requester
//         const pendingDonations = await Donation.find({
//             $or: [
//                 { status: "pending" },
// 				{ status: "requested", agent: agentId },
// 				{status: "rejected", agent: agentId}
//             ]
//         }).populate("donor");

// 		pendingDonations.sort((a, b) => (b.donor.donorRating || 0) - (a.donor.donorRating || 0));
		
//         // Render the listedFood.ejs file and pass the pending donations data
//         res.render("agent/listedFood", { title: "Available Donations", pendingDonations });
//     } catch (err) {
//         console.error(err);
//         req.flash("error", "Some error occurred on the server.");
//         res.redirect("back");
//     }
// });

router.get("/agent/listedFood", middleware.ensureAgentVerified, middleware.ensureAgentLoggedIn, async (req, res) => {
    try {
        const agent = req.user; // Assume req.user contains agent's data, including location

        // Check if the agent's location is set
        if (!agent.location || !agent.location.coordinates) {
            req.flash("error", "Agent location is not set. Please update your profile with a valid city and state.");
            return res.redirect("/agent/profile");
        }

        // Define maximum distance (e.g., 500 kilometers)
        const MAX_DISTANCE = 500000; // in meters

        // Use MongoDB's aggregation to filter by proximity, status, and join donor details
        const donations = await Donation.aggregate([
            {
                $geoNear: {
                    near: { type: "Point", coordinates: agent.location.coordinates },
                    distanceField: "dist.calculated",
                    spherical: true,
                    maxDistance: MAX_DISTANCE,
                    query: {
                        $or: [
                            { status: "pending" },
                            { status: "requested", agent: agent._id },
                            { status: "rejected", agent: agent._id }
                        ]
                    },
                },
            },
            {
                $lookup: {
                    from: "users", // Collection name for donors (usually the name of the `User` model)
                    localField: "donor", // Field in the Donation model that references the donor
                    foreignField: "_id", // Field in the User model that corresponds to the donor's ID
                    as: "donorDetails", // Name of the array to store the joined donor data
                },
            },
            {
                $unwind: "$donorDetails", // Convert the donorDetails array into a single object
            },
        ]);

        // Render the listedFood.ejs file and pass the filtered donations
        res.render("agent/listedFood", { title: "Available Donations", donations });
    } catch (error) {
        console.error("Error fetching nearby donations:", error);
        req.flash("error", "Error fetching nearby donations.");
        res.redirect("back");
    }
});

router.get("/agent/donation/view/:donationId", middleware.ensureAgentLoggedIn, async (req,res) => {
	try
	{
		const donationId = req.params.donationId;
		const donation = await Donation.findById(donationId).populate("donor").populate("agent");
		res.render("agent/donation", { title: "Donation details", donation });
	}
	catch(err)
	{
		console.log(err);
		req.flash("error", "Some error occurred on the server.")
		res.redirect("back");
	}
});

router.get("/agent/donation/request/:id", middleware.ensureAgentLoggedIn, async (req, res) => {
	try {
		// Update the donation status to "requested"
		const donation = await Donation.findByIdAndUpdate(req.params.id, { status: "requested", agent: req.user._id }, { new: true });
		if (!donation) {
			req.flash("error", "Donation not found.");
			return res.redirect("back");
		}
		req.flash("success", "Food request has been sent to the donor.");
		res.redirect("/agent/listedFood");  // Redirect back to the agent's list of donations
	} catch (err) {
		console.log(err);
		req.flash("error", "An error occurred while sending the request.");
		res.redirect("back");
	}
});


router.get("/agent/donation/collect/:id", middleware.ensureAgentLoggedIn, async (req, res) => {
	try {
		const donation = await Donation.findById(req.params.id).populate("donor").populate("agent");
		if (!donation) {
			req.flash("error", "Donation not found.");
			return res.redirect("back");
		}

		// Render the collect.ejs file with donation details for further actions
		res.render("agent/collect", { title: "Collect Donation", donation });
	} catch (err) {
		console.log(err);
		req.flash("error", "An error occurred while loading the collection page.");
		res.redirect("back");
	}
});

// In your routes file
router.get("/agent/terms", middleware.ensureAgentLoggedIn, async (req,res) =>{
    try {
        const pendingCollections = await Donation.find({ agent: req.user._id, status: "assigned" }).populate("donor");
		// console.log("Pending Collections:", pendingCollections); // Check data here

		res.render("agent/terms", { pendingCollections });
    } catch (error) {
        console.error(error);
        res.redirect("back");
    }
});
router.get("/agent/donation/deleteRejected/:collectionId", async (req,res) => {
	try
	{
		const collectionId = req.params.collectionId;
		const rejectedReq = await Donation.findByIdAndDelete(collectionId);
		// await Donation.findByIdAndDelete(donationId);
		res.redirect("/agent/rejectedReq");
	}
	catch(err)
	{
		console.log(err);
		req.flash("error", "Some error occurred on the server.")
		res.redirect("back");
	}
});

router.get("/agent/rejectedReq", middleware.ensureAgentLoggedIn, async (req,res) => {
	try
	{
		const pendingCollections = await Donation.find({ agent: req.user._id, status: "rejected" }).populate("donor");
		res.render("agent/rejectedReq", { title: "Pending Collections", pendingCollections });
	}
	catch(err)
	{
		console.log(err);
		req.flash("error", "Some error occurred on the server.")
		res.redirect("back");
	}
});


router.post("/agent/collection/feedback/:collectionId", middleware.ensureAgentLoggedIn, async (req, res) => {
    try {
        const collectionId = req.params.collectionId;
        const { rating, comments } = req.body;

        // Assuming you have a donorRating field in the Donation schema
        const updatedCollection = await Donation.findByIdAndUpdate(
            collectionId, 
            { 
                donorRating: rating,
                donorComments: comments,
				feedbackGiven: true 
            },
            { new: true }
        );

        if (!updatedCollection) {
            req.flash("error", "Collection not found");
            return res.redirect("back");
        }

        req.flash("success", "Feedback submitted successfully");
        res.redirect(`/agent/collection/view/${collectionId}`);
    } catch (err) {
        console.error(err);
        req.flash("error", "An error occurred while submitting feedback.");
        res.redirect("back");
    }
});
router.post("/agent/collection/feedback-dismissed/:collectionId", middleware.ensureAgentLoggedIn, async (req, res) => {
    try {
        const collectionId = req.params.collectionId;
        await Donation.findByIdAndUpdate(collectionId, { feedbackDismissed: true });
        res.status(200).send();
    } catch (err) {
        console.error(err);
        res.status(500).send("Error updating feedback status");
    }
});

module.exports = router;