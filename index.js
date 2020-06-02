let express = require("express");
let jwt = require("jsonwebtoken");
let spreadsheet = require("./spreadsheet");
let app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get("/api", (req, res) => res.send("Hello World"));

app.get("/api/leaderboard", (req, res) =>
  spreadsheet.leaderboard().then((obj) => res.send(JSON.stringify(obj)))
);

// Process puzzle answer and update scores
// TODO: update redirect links and error handling, include answer checking
app.post("/api/solve", verifyGroup, (req, res) => {
  jwt.verify(req.token, "secretkey", (err, groupData) => {
    if (err) {
      res.status(403).json({ msg: "error" });
    } else {
      spreadsheet.solved(req.puzzleName, groupData.group).then(() => {
        res.send(groupData);
      });
    }
  });
});

// Group registration
// TODO: update redirect link
app.post("/api/signup", (req, res) => {
  const newGroup = {
    Name: req.body.name,
    Password: req.body.password,
  };

  if (!newGroup.Name || !newGroup.Password) {
    res.status(400).json({ msg: "Please include a name or a password" });
  } else {
    spreadsheet.authenticate(newGroup).then((x) => {
      if (x) {
        res.status(400).json({
          msg:
            "This team name is already registered. Please login or get a new team name",
        });
      } else {
        spreadsheet.save(newGroup).then((x) => res.send(JSON.stringify(x)));
        res.redirect("http://nusmsl.com/hunt/map.html");
      }
    });
  }
});

// Group login
app.post("/api/login", (req, res) => {
  const group = {
    Name: req.body.name,
    Password: req.body.password,
  };

  if (!group.Name || !group.Password) {
    res.status(400).json({ msg: "Please enter your name and password" });
  } else {
    spreadsheet.verify(group).then((x) => {
      if (x) {
        jwt.sign({ group }, "secretkey", (err, token) => {
          res.json({ token });
        });
      } else {
        res
          .status(400)
          .json({ msg: "Invalid name/password. Please try again or register" });
      }
    });
  }
});

// Verify group token
function verifyGroup(req, res, next) {
  const header = req.headers["authorization"];
  // If header is undefined send error,
  // else get token and call the next middleware
  if (typeof header !== undefined) {
    const bearer = header.split(" ");
    const token = bearer[1];
    req.token = token;
    next();
  } else {
    res.status(403).json({ msg: "Please login to submit your answer" });
  }
}

app.listen(3000, () => console.log("Server running at Port 3000"));
