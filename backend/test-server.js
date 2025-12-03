const express = require('express');
const app = express();

app.get('/test', (req, res) => {
  console.log('✅ Request primit!');
  res.json({ success: true, message: 'Server funcționează!' });
});

app.listen(3001, '127.0.0.1', () => {
  console.log('🚀 Test server pe portul 3001');
});
