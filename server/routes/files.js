import express from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
}).single('file');

router.post('/headers', (req, res) => {
  console.log('[Files] Received headers request');
  
  upload(req, res, async (err) => {
    try {
      // Handle multer errors
      if (err instanceof multer.MulterError) {
        console.error('[Files] Multer error:', err);
        return res.status(400).json({
          error: 'File upload error',
          details: err.message
        });
      } else if (err) {
        console.error('[Files] Upload error:', err);
        return res.status(500).json({
          error: 'Upload failed',
          details: err.message
        });
      }

      // Check if file exists
      if (!req.file) {
        console.error('[Files] No file in request');
        return res.status(400).json({
          error: 'No file uploaded',
          details: 'Please select a file to upload'
        });
      }

      console.log('[Files] Processing file:', {
        filename: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      });

      // Check file type
      if (!req.file.originalname.match(/\.(xlsx|xls)$/)) {
        console.error('[Files] Invalid file type:', req.file.originalname);
        return res.status(400).json({
          error: 'Invalid file type',
          details: 'Only Excel files (.xlsx, .xls) are allowed'
        });
      }

      // Read the Excel file from buffer
      console.log('[Files] Attempting to read Excel buffer');
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });

      // Get the first worksheet
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        console.error('[Files] No sheets found in workbook');
        return res.status(400).json({
          error: 'Invalid Excel file',
          details: 'Excel file is empty'
        });
      }

      console.log('[Files] Found sheet:', firstSheetName);
      const worksheet = workbook.Sheets[firstSheetName];

      // Get headers (first row)
      const headers = [];
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
      console.log('[Files] Sheet range:', worksheet['!ref']);
      
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cell = worksheet[XLSX.utils.encode_cell({ r: 0, c: C })];
        headers.push(cell ? cell.v : '');
      }

      // Filter out empty headers
      const validHeaders = headers.filter(Boolean);

      if (validHeaders.length === 0) {
        console.error('[Files] No valid headers found');
        return res.status(400).json({
          error: 'Invalid Excel file',
          details: 'No valid headers found in Excel file'
        });
      }

      console.log('[Files] Successfully parsed headers:', validHeaders);

      res.json({
        filename: req.file.originalname,
        fields: validHeaders
      });

    } catch (error) {
      console.error('[Files] Excel parsing failed:', {
        error: error.message,
        stack: error.stack,
        file: req.file?.originalname
      });
      
      res.status(500).json({
        error: 'Failed to process Excel file',
        details: error.message
      });
    }
  });
});

export default router;