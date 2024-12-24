const express = require('express');
const rateLimit = require('express-rate-limit');
const redis = require('redis');

const app = express();
const redisClient = redis.createClient();

// Rate Limiting Middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later.',
  handler: (req, res) => {
    res.status(429).send(res.rateLimit.message);
  }
});

// Middleware to check IP against Redis blacklist
const checkBlacklist = (req, res, next) => {
  const ip = req.ip;
  redisClient.get(ip, (err, reply) => {
    if (err) throw err;
    if (reply) {
      return res.status(403).send('Your IP is blacklisted.');
    }
    next();
  });
};

// Route with rate limiting and blacklist check
app.use(limiter);
app.use(checkBlacklist);

app.get('/', (req, res) => {
  res.send('Welcome to the protected website!');
});

// Blacklist an IP (example endpoint)
app.post('/blacklist', (req, res) => {
  const ip = req.body.ip;
  redisClient.set(ip, 'blacklisted', 'EX', 3600, (err) => {
    if (err) throw err;
    res.send(`IP ${ip} blacklisted for 1 hour.`);
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
