
 const { Pool } = require('pg');
 const dotenv = require('dotenv');
 
 dotenv.config();

 var password = '45W4xcY9*?fZZr2';
 
 const pool = new Pool({
   connectionString: 'postgresql://sfm-mobile-user:45W4xcY9*%3FfZZr2@10.10.24.14:5432/test-fo-db',
 });
 
 pool.on('connect', () => {
   console.log('Законетился!');
 });
 
 module.exports = {
   query: (text, params) => pool.query(text, params),
 };