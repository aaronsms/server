const express = require('express');
const spreadsheet = require('./spreadsheet');
const app = express();
const HOSTNAME = '127.0.0.1';
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'http://localhost:63342');
    next();
});

app.get('/api/credentials',
    (req, res) => spreadsheet.credentials()
        .then(obj => res.send(JSON.stringify(obj))));

app.get('/api/leaderboard',
    (req, res) => spreadsheet.leaderboard()
        .then(obj => res.send(JSON.stringify(obj))));

app.post('/api/signup', (req, res) => {
    const newGroup = {
        Name: req.body.name,
        Password: req.body.password,
    };

    if (!newGroup.Name || !newGroup.Password) {
        res.status(400).json({ msg: 'Please include a name or a password' });
    } else {
        spreadsheet.save(newGroup).then(x => res.send(JSON.stringify(x)));
    }
});

app.post('/api/login', (req, res) => {
    const group = {
        Name: req.body.name,
        Password: req.body.password,
    };

    if (!group.Name || !group.Password) {
        res.status(400).json({ msg: 'Please enter your name and password' });
    } else {
        spreadsheet.verify(group).then(x => res.send(JSON.stringify(x)));
    }
});

app.listen(PORT, () => console.log(`Server running at http://${HOSTNAME}:${PORT}/`));