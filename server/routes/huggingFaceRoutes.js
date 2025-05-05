const express = require('express');
const router = express.Router();
const huggingFaceController = require('../controllers/huggingFaceController');

router.post('/generate', huggingFaceController.generateResponse);

module.exports = router; 