
 const { Pool } = require('pg');
 const dotenv = require('dotenv');
 
 dotenv.config();
 
 const pool = new Pool({
   connectionString: 'postgres://postgres:chelovekpauk@demo-postgres.crge16hxgttg.eu-north-1.rds.amazonaws.com:5432/web-sfm-mobile',
 });
 
 pool.on('connect', () => {
   console.log('Законетился!');
 });
 
 module.exports = {
   query: (text, params) => pool.query(text, params),
 };