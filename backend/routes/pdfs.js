const express = require('express');
const {
  uploadPDF,
  getUserPDFs,
  getPDF,
  updateAnnotations,
  deletePDF,
  getAnnotations
} = require('../controllers/pdfController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.use(protect);

router.post('/upload', upload.single('pdf'), uploadPDF);
router.get('/', getUserPDFs);
router.get('/:id', getPDF);
router.get('/:id/annotations', getAnnotations);
router.put('/:id/annotations', updateAnnotations);
router.delete('/:id', deletePDF);

module.exports = router;