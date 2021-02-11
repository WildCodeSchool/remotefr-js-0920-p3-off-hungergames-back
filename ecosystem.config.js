module.exports = {
  apps : [{
    name: 'off-feedme-api',
    script: 'index.js',
    env: {
      "NODE_ENV": "development",
    },
    env_production : {
      "NODE_ENV": "production"
    }
  }]
};
