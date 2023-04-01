const express = require('express');
const router = express.Router();
const dbConnection = require('./dbConnection');
const validator = require('validator');
// Insert Api
router.post('/insert', (req, res) => {
    const { fullName, username, password, birthDate, sex, accountType, terms, email } = req.body;
    res.header("Access-Control-Allow-Origin", "*");
    // Validate user input
    if (!fullName || !username || !password || !birthDate || !sex || !accountType || !terms || !email) {
        return res.status(400).send('Missing required fields');
    }
    if (!validator.isEmail(email)) {
        return res.status(400).send('Invalid email address');
    }
    if (username || email) {
        const searchUserQuery = `SELECT * FROM users WHERE username = ? OR email = ?`;
        dbConnection.query(searchUserQuery, [username, email], (err, result) => {
            if (err) {
                return res.status(500).send("Unable to Connect Database");
            } else {
                if (result.length === 0) {
                    const insertUserQuery = `INSERT INTO users (_id, fullName, username, password, birthDate, sex, accountType, terms, email) VALUES (NULL, ?, ?, sha1(?), ?, ?, ?, ?, ?)`;
                    const values = [fullName, username, password, birthDate, sex, accountType, terms, email];
                    dbConnection.query(insertUserQuery, values, (err, result) => {
                        if (err) {
                            console.error('Error inserting record: ', err);
                            return res.status(500).send('Error inserting record into database');
                        } else {
                            console.log('Record inserted successfully!');
                            return res.status(200).send('Thank you for Registration. Please Login to use Interview Portal ');
                        }
                    });
                } else {
                    if (result[0].username === username) {
                        return res.status(400).send("username is already in use")
                    } else {
                        if ((result[0].email === email)) {
                            return res.status(400).send("email is already in use")
                        }
                    }

                }
            }
        })
    }

});

// Fetch Api
router.post("/user", (req, res) => {
    const { username, password } = req.body
    res.header("Access-Control-Allow-Origin", "*");
    const fetchUserQuery = `SELECT * FROM users WHERE (username = ? OR email = ?) AND password = sha1(?)`;
    const values = [username, username, password]
    dbConnection.query(fetchUserQuery, values, (err, result) => {
        if (err) {
            return res.status(500).send("Error Fetching user from Database");
        } else {
            if (result.length === 0) {
                return res.status(400).send("User does not exist");
            } else {
                delete result[0].password
                result[0].terms = true
                return res.status(200).send(result[0]);
            }
        }
    })
})

module.exports = router;
