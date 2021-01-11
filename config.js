require('dotenv').config();

// Feel free to add your own settings,
// e.g. DB connection settings
const originsAllowed = ['http://localhost:8080'];

module.exports = {
  port: process.env.PORT || 5000,
  ROBOTOFF_API_URL: process.env.ROBOTOFF_API_URL,
  OFF_API_URL: process.env.OFF_API_URL,
  OFF_IMAGE_URL: process.env.OFF_IMAGE_URL,
  originsAllowed,
};
