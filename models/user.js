const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
	firstName: {
		type: String,
		required: true
	},
	lastName: {
		type: String,
		required: true
	},
	email: {
		type: String,
		required: true
	},
	cin: {
		type: Number,
		required: true
	},
	address: {
		type: String,
		// required: true
	},
	city: {
		type: String,
		// required: true
	},
	state: {
		type: String,
		// required: true
	},
	pin: {
		type: Number, 
		// required: true
	},
	phone: {
		type: Number,
		required: true
	},
	password: {
		type: String,
		required: true
	},
	gender: {
		type: String,
		enum: ["male", "female"]
	},
	address: String,
	phone: Number,
	joinedTime: {
		type: Date,
		default: Date.now
	},
	role: {
		type: String,
		enum: ["admin", "donor", "agent"],
		required: true
	},
	verification_status: {
        type: String,
        enum: ["Pending", "Verified", "Rejected"],
        default: "Pending"
    },
	location: {
		type: {
		  type: String,
		  enum: ['Point'],
		},
		coordinates: {
		  type: [Number] // [longitude, latitude]
		}
	}
});

userSchema.index({ location: "2dsphere" });
const User = mongoose.model("users", userSchema);
module.exports = User;