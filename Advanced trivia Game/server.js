
const mongoose = require("mongoose");
const express = require('express');
const session = require('express-session')
const MongoDBStore = require('connect-mongodb-session')(session);

const Question = require("./QuestionModel");
const User = require("./UserModel");
const store = new MongoDBStore({
	uri: 'mongodb://localhost:27017/tokens',
	collection: 'sessiondata'
});
let mongo = require('mongodb');
let MongoClient = mongo.MongoClient;
const ObjectId = require('mongodb').ObjectID
const app = express();
//const bodyParser=require('body-parser')
app.use(express.urlencoded({ extended: true }));

app.set("view engine", "pug");
app.use(express.static("public"));
app.use(express.json());
app.use(session({ secret: 'some secret here', store: store }))
app.get('/', function (req, res, next) {
	res.render("pages/index", { "session": req.session });
	return;
});
app.post("/login", function (req, res, next) {//login 
	if (req.session.loggedin && req.body.username == req.session.username) {//verify the username and the session
		res.status(200).send("logged in")
	}

	let username = req.body.username;

	console.log(req.body);
	let password = req.body.password;
	db.collection("users").findOne({ username: username }, function (err, result) {//search for thr username 
		if (err) throw err;
		console.log(result);
		if (result) {
			if (result.password == password) {//if the passwords match save the sassion with the users info
				console.log("yes")
				req.session.loggedin = true;
				req.session.username = username;
				req.session.userid = result._id;
				res.redirect("/users/:" + result._id);
			} else {
				res.status(401).send("not authorized")
			}
		} else {
			res.status(401).send("Not authorized. Invalid username.");
			return;
		}
	})
})
app.get("/logout", function (req, res, next) {//logout
	if (req.session.loggedin) {
		req.session.loggedin = false;
		req.session.destroy(req.session.sid, function () {//revove session
			console.log("deleted");
		})
		res.redirect("/");//redirect to homepage 
	}
})
app.post("/users/:userID", function (req, res, next) {//when user saves privacy 

	let oid;
	try {
		oid = new mongo.ObjectID(req.params.userID);//make the id object 
	} catch{
		res.status(404).send("Unknown ID");
		return;
	}
	db.collection("users").updateOne({ _id: oid }, { $set: { privacy: req.body.private } }, function (err, result) {
		if (err) {//update the privacy of the user 
			throw err;

		}
		
		res.redirect("/users/" + req.params.userID)//redirect to the users page 
	})
	
})


app.get("/users/:userID", function (req, res, next) {
	console.log(req.params.userID);
	if (req.loggedin && req.session.username == req.params.userID) {//if the user is logged in and selects his account 
		let oid;
		try {
			oid = new mongo.ObjectID(req.params.userID);
		} catch{
			res.status(404).send("Unknown ID");
			return;
		}


		db.collection("users").findOne({ "_id": oid }, function (err, result) {

			if (err) {
				res.status(500).send("Error reading database.");
				return;
			} else if (!result) {
				res.status(404).send("Unknown ID");
				return;
			} else {
				res.render("pages/user", { session: req.session, user: result });//render the page for the users info 
			}



		});
	} else {//if user views a different user
		let oid;
		try {
			oid = new mongo.ObjectID(req.params.userID);
		} catch{
			res.status(404).send("Unknown ID");
			return;
		}


		db.collection("users").findOne({ "_id": oid }, function (err, result) {

			if (err) {
				res.status(500).send("Error reading database.");
				return;
			} else if (!result) {
				res.status(404).send("Unknown ID");
				return;
			} else {
				if (result.privacy == true) {//if the privacy is true then he does not have access 
					res.status(403).send("invalid request")
				}
				res.render("pages/user", { session: req.session, user: result });//display the page without the privacy setting
			}
		})
	}
})
//Returns a page with a new quiz of 10 random questions

app.get("/quiz", function (req, res, next) {
	Question.getRandomQuestions(function (err, results) {
		if (err) throw err;
		res.status(200).render("pages/quiz", { questions: results, session: req.session });
		//pass the req.session for the header 
		return;
	});
})

app.get("/users", function (req, res, next) {
	db.collection("users").find({ privacy: false }).toArray(function (err, result) {
		console.log(result)//display all users 
		res.render("pages/users", { session: req.session, result: result });
	})
})
//The quiz page posts the results here
//Extracts the JSON containing quiz IDs/answers
//Calculates the correct answers and replies
app.post("/quiz", function (req, res, next) {
	let ids = [];
	try {
		//Try to build an array of ObjectIds
		for (id in req.body) {
			ids.push(new mongoose.Types.ObjectId(id));
		}

		//Find all questions with Ids in the array
		Question.findIDArray(ids, function (err, results) {
			if (err) throw err; //will be caught by catch below

			//Count up the correct answers
			let correct = 0;
			for (let i = 0; i < results.length; i++) {
				if (req.body[results[i]._id] === results[i].correct_answer) {
					correct++;
				}
			}
			if (req.session.loggedin) {//if the user is logged in the update his score 
				db.collection("users").updateOne({ _id: new ObjectId(req.session.userid) }, { $inc: { total_quizzes: 1, total_score: correct } });
				console.log("updated");
				res.json({ url: "/users/:" + req.session.userid, correct: correct });
			} else {
				res.json({ url: "/", correct: correct });
				return;
			}
			//Send response

		});
	} catch (err) {
		//If any error is thrown (casting Ids or reading database), send 500 status
		console.log(err);
		res.status(500).send("Error processing quiz data.");
		return;
	}

});

//Connect to database
mongoose.connect('mongodb://localhost/quiztracker', { useNewUrlParser: true });
let db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
	app.listen(3000);
	console.log("Server listening on port 3000");
});