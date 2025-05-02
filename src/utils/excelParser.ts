import * as XLSX from 'xlsx';

export async function parseExcelFile(buffer: ArrayBuffer): Promise<Record<string, any>[]> {
  try {
    // Read the Excel file from the ArrayBuffer
    const workbook = XLSX.read(buffer, { type: 'array' });
    
    // Get the first worksheet
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new Error('No worksheet found in Excel file');
    }
    
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON with empty string as default value for empty cells
    const results = XLSX.utils.sheet_to_json(worksheet, { 
      defval: '',
      raw: false, // Convert all numbers to strings for consistent handling
      dateNF: 'YYYY-MM-DD' // Format dates as YYYY-MM-DD
    });

    if (!Array.isArray(results) || results.length === 0) {
      throw new Error('No data found in Excel file');
    }

    // Ensure all values are strings
    return results.map(row => {
      const processedRow: Record<string, string> = {};
      for (const [key, value] of Object.entries(row)) {
        // Handle dates specially
        if (value instanceof Date) {
          processedRow[key] = value.toISOString().split('T')[0];
        } else {
          processedRow[key] = String(value).trim();
        }
      }
      return processedRow;
    });
  } catch (error) {
    throw new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function validateExcelColumns(headers: string[], requiredColumns: string[]): string[] {
  const missingColumns = requiredColumns.filter(
    col => !headers.some(h => h.toLowerCase() === col.toLowerCase())
  );
  return missingColumns;
}