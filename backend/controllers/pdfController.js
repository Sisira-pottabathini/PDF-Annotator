const PDF = require('../models/PDF');
const pdfParse = require('pdf-parse');
const fs = require('fs').promises;
const path = require('path');

// Upload PDF
exports.uploadPDF = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a PDF file'
      });
    }

    // Read PDF to get page count
    const dataBuffer = await fs.readFile(req.file.path);
    const pdfData = await pdfParse(dataBuffer);

    // Create PDF document
    const pdf = await PDF.create({
      userId: req.user.id,
      originalName: req.file.originalname,
      fileName: req.file.filename,
      filePath: req.file.path,
      fileSize: req.file.size,
      pages: pdfData.numpages,
      annotations: []
    });

    res.status(201).json({
      success: true,
      message: 'PDF uploaded successfully',
      data: {
        pdf: {
          id: pdf._id,
          originalName: pdf.originalName,
          fileName: pdf.fileName,
          fileSize: pdf.fileSize,
          pages: pdf.pages,
          uploadDate: pdf.uploadDate,
          annotationsCount: pdf.annotations.length
        }
      }
    });
  } catch (error) {
    // Clean up uploaded file if error occurs
    if (req.file) {
      await fs.unlink(req.file.path).catch(console.error);
    }
    
    res.status(500).json({
      success: false,
      message: 'Error uploading PDF',
      error: error.message
    });
  }
};

// Get all PDFs for user
exports.getUserPDFs = async (req, res) => {
  try {
    const pdfs = await PDF.find({ userId: req.user.id })
      .select('-filePath -annotations')
      .sort({ uploadDate: -1 });

    res.status(200).json({
      success: true,
      data: {
        pdfs: pdfs.map(pdf => ({
          id: pdf._id,
          name: pdf.originalName,
          size: (pdf.fileSize / (1024 * 1024)).toFixed(2) + ' MB',
          pages: pdf.pages,
          uploadDate: pdf.uploadDate.toLocaleDateString(),
          uploadTime: pdf.uploadDate.toISOString(),
          annotationsCount: pdf.annotations.length,
          backendId: pdf._id,
          source: 'backend'
        }))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching PDFs',
      error: error.message
    });
  }
};

// Get single PDF
exports.getPDF = async (req, res) => {
  try {
    const pdf = await PDF.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!pdf) {
      return res.status(404).json({
        success: false,
        message: 'PDF not found'
      });
    }

    // Serve the PDF file
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${pdf.originalName}"`);
    
    const fileBuffer = await fs.readFile(pdf.filePath);
    res.send(fileBuffer);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching PDF',
      error: error.message
    });
  }
};

// Update annotations
exports.updateAnnotations = async (req, res) => {
  try {
    const { annotations } = req.body;

    const pdf = await PDF.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { 
        annotations: annotations,
        lastModified: Date.now()
      },
      { new: true, runValidators: true }
    );

    if (!pdf) {
      return res.status(404).json({
        success: false,
        message: 'PDF not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Annotations updated successfully',
      data: {
        annotations: pdf.annotations
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating annotations',
      error: error.message
    });
  }
};

// Delete PDF
exports.deletePDF = async (req, res) => {
  try {
    const pdf = await PDF.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!pdf) {
      return res.status(404).json({
        success: false,
        message: 'PDF not found'
      });
    }

    // Delete file from filesystem
    await fs.unlink(pdf.filePath);

    // Delete from database
    await PDF.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'PDF deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting PDF',
      error: error.message
    });
  }
};

// Get PDF annotations
exports.getAnnotations = async (req, res) => {
  try {
    const pdf = await PDF.findOne({
      _id: req.params.id,
      userId: req.user.id
    }).select('annotations');

    if (!pdf) {
      return res.status(404).json({
        success: false,
        message: 'PDF not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        annotations: pdf.annotations
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching annotations',
      error: error.message
    });
  }
};