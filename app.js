const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

const cors = require('cors');
app.use(cors());

// Body parsers (MUST be before routes)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'views')));

// Route to serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

const apiRoutes = require('./routes/api');
app.use('/api', apiRoutes);

// Start server
app.listen(port, () => {
    console.log(`Server started on http://localhost:${port}`);
});