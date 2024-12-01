const mongoose = require("mongoose");

const donationSchema = new mongoose.Schema({
	donor: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "users",
		required: true
	},
	agent: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "users",
	},
	foodType: {
		type: String,
		required: true
	},
	quantity: {
		type: String,
		required: true
	},
	cookingTime: {
		type: Date,
		required: true
	},
	address: {
		type: String,
		required: true
	},
	city: { 
		type: String, 
		required: true 
	},
  	state: { 
		type: String, 
		required: true 
	},
  	pincode: String,
	phone: {
		type: Number,
		required: true
	},
	donorToAdminMsg: String,
	adminToAgentMsg: String,
	collectionTime: {
		type: Date,
	},
	status: {
		type: String,
		enum: ["pending", "requested", "assigned", "collected","rejected"],
		required: true
	},
	// New fields for the geotagged photo upload
	foodPhotoPath: {
		type: String,
		required: true // Ensures the file path is saved
	},
	// geolocation: {
	// 	latitude: {
	// 		type: Number,
	// 		required: true
	// 	},
	// 	longitude: {
	// 		type: Number,
	// 		required: true
	// 	}
	// },

	location: {
		type: {
		  type: String,
		  enum: ['Point'],
		  required: true
		},
		coordinates: {
		  type: [Number], // [longitude, latitude]
		  required: true
		}
	},
	// Assuming the Donation schema has a `feedback` object for agent feedback
	donorRating: {
        type: Number, // Make sure it's a number
        default: 0
    },
    donorComments: String,
	feedbackGiven: { type: Boolean, default: false }

});

donationSchema.index({ location: "2dsphere" }); // for efficient geospatial queries
const Donation = mongoose.model("donations", donationSchema);
module.exports = Donation;