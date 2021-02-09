module.exports = {
  apps : [{
    name: 'off-hungergames-back',
    script: 'index.js',
    env: {
      "NODE_ENV": "development",
    },
    env_production : {
      "NODE_ENV": "production"
    }
  }]
};
