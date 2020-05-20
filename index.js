let express = require('express')
let spreadsheet = require('./spreadsheet')
let app = express()


app.use(express.json());
app.use(express.urlencoded({ extended: false }));


app.get('/api', (req, res) => res.send('Hello World'))

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

app.listen(3000, () => console.log('Server running at Port 3000'))
