const bcrypt = require('bcryptjs');
const hash = '$2b$10$eFMxYVs9eJ4wD5YnvBLRpOWAOlP4QV.gWCUbpxwqTqU2yONFU0Ozq';
const password = 'Login@2026';

bcrypt.compare(password, hash).then(res => {
  console.log('Password match:', res);
});
