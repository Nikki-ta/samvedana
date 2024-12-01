const express = require("express");
const router = express.Router();
const middleware = require("../middleware/index.js");
const User = require("../models/user.js");
const Donation = require("../models/donation.js");
const multer = require('multer');
const getCoordinates = require("../Utils/geocode");
// const mongoose = require('mongoose');
const { ExifImage } = require('exif');  // For extracting EXIF data to check geotag

// Set up multer for file uploads
const upload = multer({ dest: 'uploads/' });


router.get("/donor/dashboard", middleware.ensureDonorLoggedIn, async (req,res) => {
	const donorId = req.user._id;
	const numPendingDonations = await Donation.countDocuments({ donor: donorId, status: "pending" });
	const numRequestedDonations = await Donation.countDocuments({ donor: donorId, status: "requested" });
	const numAssignedDonations = await Donation.countDocuments({ donor: donorId, status: "assigned" });
	const numCollectedDonations = await Donation.countDocuments({ donor: donorId, status: "collected" });
	res.render("donor/dashboard", {
		title: "Dashboard",
		numPendingDonations, numRequestedDonations, numAssignedDonations, numCollectedDonations
	});
});

router.get("/donor/donate", middleware.ensureDonorLoggedIn, middleware.ensureDonorVerified, (req, res) => {
    res.render("donor/donate", { title: "Donate" });
});

// router.post("/donor/donate", middleware.ensureDonorLoggedIn, upload.single('foodPhoto'), async (req,res) => {
// 	try {
//         const donation = req.body.donation;
//         donation.status = "pending";
//         donation.donor = req.user._id;

//         // Check if a file was uploaded
//         const file = req.file;
//         if (!file) {
//             req.flash("error", "Please upload a geotagged photo.");
//             return res.redirect("back");
//         }

//         // Extract geolocation data from the uploaded photo
//         let geolocation = null;
//         try {
//             const exifData = await new Promise((resolve, reject) => {
//                 new ExifImage({ image: file.path }, function (error, exifData) {
//                     if (error) reject(error);
//                     else resolve(exifData);
//                 });
//             });

//             const gpsData = exifData.gps;
//             if (gpsData && gpsData.GPSLatitude && gpsData.GPSLongitude) {
//                 geolocation = {
//                     latitude: gpsData.GPSLatitude[0] + gpsData.GPSLatitude[1] / 60 + gpsData.GPSLatitude[2] / 3600,
//                     longitude: gpsData.GPSLongitude[0] + gpsData.GPSLongitude[1] / 60 + gpsData.GPSLongitude[2] / 3600,
//                 };

//                 // Adjust for N/S and E/W
//                 if (gpsData.GPSLatitudeRef === 'S') geolocation.latitude *= -1;
//                 if (gpsData.GPSLongitudeRef === 'W') geolocation.longitude *= -1;
//             } else {
//                 req.flash("error", "The uploaded photo must be geotagged.");
//                 return res.redirect("back");
//             }
//         } catch (error) {
//             console.log("Error reading photo metadata:", error);
//             req.flash("error", "There was an error processing the uploaded photo.");
//             return res.redirect("back");
//         }

//         // Add file path and geolocation to the donation data
//         donation.foodPhotoPath = file.path;
//         donation.geolocation = geolocation;

//         // Save the donation to the database
//         const newDonation = new Donation(donation);
//         await newDonation.save();

//         // req.flash("success", "Donation request sent successfully");
//         res.redirect("/donor/donations/pending");
//     } catch (err) {
//         console.log(err);
//         req.flash("error", "Some error occurred on the server.");
//         res.redirect("back");
//     }
// });

router.post("/donor/donate", middleware.ensureDonorLoggedIn, upload.single('foodPhoto'), async (req, res) => {
	try {
	  const donationData = req.body.donation; // Assume donation details are under req.body.donation
	  donationData.status = "pending";
	  donationData.donor = req.user._id;
  
	  // Extract city and state from donationData
	  const { city, state, address, pincode } = donationData;
  
	  // Geocode the city and state to get latitude and longitude
	  const fullAddress = `${address}, ${city}, ${state}, ${pincode}`;
	  const { latitude, longitude } = await getCoordinates(fullAddress);
  
	  // Assign coordinates to donation data as a GeoJSON Point
	  donationData.location = {
		type: "Point",
		coordinates: [longitude, latitude],
	  };
  
	  // Handle file upload if necessary (e.g., store photo path)
	  if (req.file) {
		donationData.foodPhotoPath = `/${req.file.path.replace(/\\/g, '/')}`;
	}
	
	  // Create and save the donation
	  const newDonation = new Donation(donationData);
	  await newDonation.save();
  
	  req.flash("success", "Donation request sent successfully");
	  res.redirect("/donor/donations/pending");
	} catch (err) {
	  console.error("Error creating donation:", err);
	  req.flash("error", "Some error occurred on the server.");
	  res.redirect("back");
	}
  });

router.get("/donor/donations/pending", middleware.ensureDonorLoggedIn, async (req,res) => {
	try
	{
		const pendingDonations = await Donation.find({ donor: req.user._id, status: ["pending"] }).populate("agent");
		res.render("donor/pendingDonations", { title: "Pending Donations", pendingDonations });
	}
	catch(err)
	{
		console.log(err);
		req.flash("error", "Some error occurred on the server.")
		res.redirect("back");
	}
});

router.get("/donor/donations/previous", middleware.ensureDonorLoggedIn, async (req,res) => {
	try
	{
		const previousDonations = await Donation.find({ donor: req.user._id, status: "collected" }).populate("agent");
		res.render("donor/previousDonations", { title: "Previous Donations", previousDonations });
	}
	catch(err)
	{
		console.log(err);
		req.flash("error", "Some error occurred on the server.")
		res.redirect("back");
	}
});

router.get("/donor/donation/deleteRejected/:donationId", async (req,res) => {
	try
	{
		const donationId = req.params.donationId;
		await Donation.findByIdAndDelete(donationId);
		res.redirect("/donor/donations/pending");
	}
	catch(err)
	{
		console.log(err);
		req.flash("error", "Some error occurred on the server.")
		res.redirect("back");
	}
});

router.get("/donor/profile", middleware.ensureDonorLoggedIn, (req,res) => {
	res.render("donor/profile", { title: "My Profile" });
});

router.put("/donor/profile", middleware.ensureDonorLoggedIn, async (req,res) => {
	try
	{
		const id = req.user._id;
		const updateObj = req.body.donor;	// updateObj: {firstName, lastName, gender, address, phone}
		await User.findByIdAndUpdate(id, updateObj);
		
		req.flash("success", "Profile updated successfully");
		res.redirect("/donor/profile");
	}
	catch(err)
	{
		console.log(err);
		req.flash("error", "Some error occurred on the server.")
		res.redirect("back");
	}
	
});

router.get("/donor/viewRequests", middleware.ensureDonorLoggedIn, async (req, res) => {
	try {
		const requestedDonations = await Donation.find({
			donor: req.user._id,
			status: "requested"
		}).populate('agent', 'firstName lastName cin');
		res.render("donor/viewRequests", { title: "View Requests", requestedDonations });
	} catch (err) {
		console.error(err);
		req.flash("error", "Error retrieving donation requests.");
		res.redirect("back");
	}
});

// Route for donor to accept a request
router.post("/donor/donation/accept/:id", middleware.ensureDonorLoggedIn, async (req, res) => {
	try {
		const donation = await Donation.findById(req.params.id);
		if (!donation) {
			req.flash("error", "Donation request not found.");
			return res.redirect("/donor/viewRequests");
		}

		// Update status to accepted
		donation.status = "assigned";
		await donation.save();

		req.flash("success", "Donation request accepted.");
		res.redirect("/donor/viewRequests");
	} catch (err) {
		console.error(err);
		req.flash("error", "Error processing the acceptance.");
		res.redirect("/donor/viewRequests");
	}
});

// Route for donor to reject a request
router.post("/donor/donation/reject/:id", middleware.ensureDonorLoggedIn, async (req, res) => {
	try {
	  const donation = await Donation.findById(req.params.id);
	  if (!donation) {
		req.flash("error", "Donation request not found.");
		return res.redirect("/donor/viewRequests");
	  }
  
	  // Check if donation is in "pending" or "accepted" state
	//   if (donation.status !== "accepted") {
	// 	req.flash("error", "This donation request has already been processed or is not active.");
	// 	return res.redirect("/donor/viewRequests");
	//   }
  
	  // Update status to rejected and reset the assigned agent
	  donation.status = "pending"; // Reset status to "pending"
	  donation.agent = null; // Clear the assigned agent
	  await donation.save();
  
	  req.flash("success", "Donation request rejected, and status reset to pending.");
	  res.redirect("/donor/viewRequests");
	} catch (err) {
	  console.error(err);
	  req.flash("error", "Error processing the rejection.");
	  res.redirect("/donor/viewRequests");
	}
  });
  

  router.get("/donor/donation/deleteRejected/:donationId", async (req,res) => {
	try
	{
		const donationId = req.params.donationId;
		const rejectedReq = await Donation.findByIdAndDelete(donationId);
		// await Donation.findByIdAndDelete(donationId);
		res.redirect("/donor/rejectedReq");
	}
	catch(err)
	{
		console.log(err);
		req.flash("error", "Some error occurred on the server.")
		res.redirect("back");
	}
});

router.get("/donor/rejectedReq", middleware.ensureDonorLoggedIn, async (req,res) => {
	try
	{
		const pendingDonations = await Donation.find({ donor: req.user._id, status: "rejected" }).populate("donor");
		res.render("donor/rejectedReq", { title: "Pending Donations", pendingDonations });
	}
	catch(err)
	{
		console.log(err);
		req.flash("error", "Some error occurred on the server.")
		res.redirect("back");
	}
});
module.exports = router;