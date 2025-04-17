const express = require('express');
const router = express.Router();
const multer = require('multer');
const aws = require('aws-sdk');
const multerS3 = require('multer-s3');
const mysql = require('mysql2');
require('dotenv').config();

aws.config.loadFromPath('./config/config.json');
aws.config.update({ signatureVersion: 'v4' });
const s3 = new aws.S3();

const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

connection.connect((err) => {
    if (err) {
      console.error('Database connection failed:', err.stack);
      return;
    }
    console.log('Connected to database.');
});
  
const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_BUCKET_NAME,
    // acl: 'public-read',
    contentDisposition: 'inline',
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
  }),
  limits: { fileSize: 50 * 1024 * 1024 } //Increased to 50 MB
});


// Signup
const noFileUpload = multer().none(); // parses text fields only

router.post('/signup', noFileUpload, (req, res) => {
  const { firstname, lastname, email, password, aboutyou } = req.body;

  console.log("Form Data Received:", req.body);

  connection.query(
    "INSERT INTO logindata (firstname, lastname, email, password, aboutyou) VALUES (?, ?, ?, ?, ?)",
    [firstname, lastname, email, password, aboutyou],
    (err, result) => {
      if (err) {
        console.error("Query Error:", err);
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(409).json([{ msg: 'Email already registered.' }]);
        }
        return res.status(400).json([{ msg: 'Signup failed. Please try again.' }]);
      }

      console.log("Insert Success:", result);
      res.json([{ result: 'success' }]);
    }
  );
});



// Login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  connection.query(
    "SELECT * FROM logindata WHERE email = ? AND password = ?",
    [email, password],
    (err, results) => {
      if (err) return res.status(400).json({ error: err });
      if (results.length) res.json({ result: 'success' });
      else res.status(401).json({ result: 'Invalid credentials' });
    }
  );
});

// File upload
router.post('/upload', upload.single('file'), (req, res) => {
  const emailid = req.body.emailid;
  const foldername = req.body.foldername || '';

  const file = req.file;
  const filelocation = file.location;
  const filekey = file.key;
  const filename = file.originalname;
  const created = Date.now();

  connection.query(
    "INSERT INTO userdata (emailid, filelocation, filekey, filename, foldername, created) VALUES (?, ?, ?, ?, ?, ?)",
    [emailid, filelocation, filekey, filename, foldername, created],
    (err, result) => {
      if (err) return res.status(400).json({ error: err });
      res.json({ result: 'success', file: filelocation });
    }
  );
});

// File delete
router.get('/delete', (req, res) => {
  const key = req.query.key;

  s3.deleteObject({ Bucket: process.env.AWS_BUCKET_NAME, Key: key }, (err, data) => {
    if (err) return res.status(400).json({ error: err });
    connection.query(
      "DELETE FROM userdata WHERE filekey = ?",
      [key],
      (error, result) => {
        if (error) return res.status(400).json({ error });
        res.json({ result: 'deleted' });
      }
    );
  });
});

// Get user files
router.get('/userdata', (req, res) => {
  const emailid = req.query.emailid;
  connection.query(
    "SELECT * FROM userdata WHERE emailid = ?",
    [emailid],
    (err, results) => {
      if (err) return res.status(400).json({ error: err });
      res.json(results);
    }
  );
});

module.exports = router;