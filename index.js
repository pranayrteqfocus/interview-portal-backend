const express = require('express');
const bodyParser = require('body-parser');
const userAPI = require('./router');

const cors = require('cors');

const app = express();
const PORT = 8080;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use('/api', userAPI);

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
