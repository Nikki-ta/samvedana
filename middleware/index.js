const middleware = {
	ensureLoggedIn: (req, res, next) => {
		if(req.isAuthenticated()) {
			return next();
		}
		req.flash("warning", "Please log in first to continue");
		res.redirect("/auth/login");
	},
	
	ensureAdminLoggedIn: (req, res, next) => {
		if(req.isUnauthenticated()) {
			req.session.returnTo = req.originalUrl;
			req.flash("warning", "Please log in first to continue");
			return res.redirect("/auth/login");
		}
		if(req.user.role != "admin") {
			req.flash("warning", "This route is allowed for admin only!!");
			return res.redirect("back");
		}
		next();
	},
	
	ensureDonorLoggedIn: (req, res, next) => {
		if(req.isUnauthenticated()) {
			req.session.returnTo = req.originalUrl;
			req.flash("warning", "Please log in first to continue");
			return res.redirect("/auth/login");
		}
		if(req.user.role != "donor") {
			req.flash("warning", "This route is allowed for donor only!!");
			return res.redirect("back");
		}
		next();
	},
	
	ensureAgentLoggedIn: (req, res, next) => {
		if(req.isUnauthenticated()) {
			req.session.returnTo = req.originalUrl;
			req.flash("warning", "Please log in first to continue");
			return res.redirect("/auth/login");
		}
		if(req.user.role != "agent") {
			req.flash("warning", "This route is allowed for agent only!!");
			return res.location(req.get("Referrer") || "/");
		}
		next();
	},
	
	ensureNotLoggedIn: (req, res, next) => {
		if(req.isAuthenticated()) {
			req.flash("warning", "Please logout first to continue");
			if(req.user.role == "admin")
				return res.redirect("/admin/dashboard");
			if(req.user.role == "donor")
				return res.redirect("/donor/dashboard");
			if(req.user.role == "agent")
				return res.redirect("/agent/dashboard");
		}
		next();
	},
	ensureDonorVerified: (req, res, next) => {
		if (!req.user) {
			req.flash("warning", "Please log in first.");
			return res.redirect("/auth/login");
		}
		if (req.user.verification_status === "Verified") {
			return next();
		} else if (req.user.verification_status === "Rejected") {
			req.flash("error", "Your account was rejected by the admin. Contact support for assistance.");
			return res.redirect("/donor/dashboard");
		} else {
			req.flash("warning", "Your account is pending verification.");
			return res.redirect("/donor/dashboard");
		}
	},
	ensureAgentVerified: (req, res, next) => {
		if (!req.user) {
			req.flash("warning", "Please log in first.");
			return res.redirect("/auth/login");
		}
		if (req.user.verification_status === "Verified") {
			return next();
		} else if (req.user.verification_status === "Rejected") {
			req.flash("error", "Your account was rejected by the admin. Contact support for assistance.");
			return res.redirect("/agent/dashboard");
		} else {
			req.flash("warning", "Your account is pending verification.");
			return res.redirect("/agent/dashboard");
		}
	}
	
}

module.exports = middleware;