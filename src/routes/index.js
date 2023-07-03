
 const express = require('express');

 const router = express.Router();
 
 router.get('/api', (req, res) => {
   res.status(200).send({
     success: 'true',
   });
 });
 
 module.exports = router;