module.exports = {
  apps: [
    {
      name: 'auto-ecole',
      script: 'server.js',
      cwd: '/var/www/auto-ecole',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
