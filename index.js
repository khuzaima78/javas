var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var axios = require('axios');  // Import Axios
var cors = require('cors');  // Import CORS
var bodyParser = require('body-parser');  // Import body-parser
var morgan = require('morgan');  // Import morgan for logging
const { createProxyMiddleware } = require('http-proxy-middleware');  // Import Proxy Middleware

var auditToolsRouter = require('./routes/auditTools');
var q2cImportRouter = require('./routes/q2cImport');
var dashboardRouter = require('./routes/dashboard');
var offerCodeToolsRouter = require('./routes/offerCodeTools');
var apiDocRouter = require('./routes/apiDoc');

var app = express();

// CORS headers middleware
app.use(function (req, res, next) {
  // Website you wish to allow to connect
  res.setHeader('Access-Control-Allow-Origin', '*'); // Adjust as necessary

  // Request methods you wish to allow
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

  // Request headers you wish to allow (include your custom 'secure' header here)
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, content-type, Authorization, secure'); // Include 'secure'

  // Allow credentials
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Pass to next layer of middleware
  next();
});

// CORS middleware using the cors package
app.use(cors({
  origin: 'http://localhost:3000', // Or specify the origin (e.g., 'http://localhost:3000') based on your requirements
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'secure'],
  credentials: true  // Allow credentials (cookies)
}));

// Middleware setup
app.use(bodyParser.json());  // Middleware to parse JSON bodies
app.use(morgan('combined'));  // HTTP request logging

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Route to serve the try-it button UI
app.get('/try', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Proxy setup for the external API
app.use('/api',
  createProxyMiddleware({
    target: 'https://testapi.auth1.avalara.com/ws/rest/sales',  // The external API you want to call
    changeOrigin: true,
    secure: false,  // If the API uses HTTPS but has issues with SSL, set this to false
    pathRewrite: {
      '^/api': '',  // Remove '/api' from the beginning of the path
    },
    onProxyReq: (proxyReq, req, res) => {
      // Handle CORS preflight (OPTIONS) requests here
      if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        return res.sendStatus(200);  // Respond with 200 OK for OPTIONS requests
      }

      // Add custom headers for the external API call (e.g., Authorization header)
      proxyReq.setHeader('Authorization', `Bearer your-api-key-here`);
      proxyReq.setHeader('secure', req.headers['secure']);
    }
  })
);

// Example route to make an external API call using Axios
app.get('/external-api', async (req, res, next) => {
  const apiUrl = 'https://testapi.auth1.avalara.com/ws/rest/sales';
  const headers = {
    'Authorization': 'Bearer your-api-key-here',  // Example Authorization header
    'secure': req.headers['secure'],  // Use the 'secure' header passed in the request
  };

  try {
    // Making a GET request using Axios
    const response = await axios.get(apiUrl, { headers });
    res.json(response.data);  // Send the API response data back to the client
  } catch (error) {
    console.error('Error calling external API:', error.message);
    next(createError(500, 'Error fetching data from external API'));
  }
});

// Use your routers for other endpoints (remove any unnecessary routes)
app.use('/', auditToolsRouter);
app.use('/dashboard', dashboardRouter);
app.use('/audit-tools', auditToolsRouter);
app.use('/q2c-tools', q2cImportRouter);
app.use('/offercode-tools', offerCodeToolsRouter);
app.use('/api-doc', apiDocRouter);

// Catch 404 errors and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// General error handler
app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app; 