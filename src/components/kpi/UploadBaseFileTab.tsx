import React, { useRef } from 'react';
import { Upload, AlertCircle, Check, X, ChevronDown } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import * as XLSX from 'xlsx';

interface UploadedFile {
  id: string;
  name: string;
  columns: string[];
  data: any[];
  category: 'Base' | 'Hierarchy' | 'Lookup';
}

interface UploadBaseFileTabProps {
  uploadedFiles: UploadedFile[];
  setUploadedFiles: (files: UploadedFile[]) => void;
}

export function UploadBaseFileTab({
  uploadedFiles,
  setUploadedFiles
}: UploadBaseFileTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, category: 'Base' | 'Hierarchy' | 'Lookup', rowId?: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        throw new Error('No worksheet found in Excel file');
      }
      
      const worksheet = workbook.Sheets[firstSheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);
      
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('No data found in Excel file');
      }

      // Get column headers from first row
      const columns = Object.keys(data[0]);

      const newFile: UploadedFile = {
        id: rowId || crypto.randomUUID(),
        name: file.name,
        columns,
        data,
        category
      };

      if (rowId) {
        // Update existing file
        setUploadedFiles(uploadedFiles.map(f => f.id === rowId ? newFile : f));
      } else {
        // Add new file
        setUploadedFiles([...uploadedFiles, newFile]);
      }
    } catch (error) {
      console.error('Error parsing Excel file:', error);
    }
  };

  const addNewRow = () => {
    // Check if Base file already exists
    const hasBase = uploadedFiles.some(f => f.category === 'Base');
    // Check if Hierarchy file already exists
    const hasHierarchy = uploadedFiles.some(f => f.category === 'Hierarchy');

    let category: 'Base' | 'Hierarchy' | 'Lookup';
    if (!hasBase) {
      category = 'Base';
    } else if (!hasHierarchy) {
      category = 'Hierarchy';
    } else {
      category = 'Lookup';
    }

    const newFile: UploadedFile = {
      id: crypto.randomUUID(),
      name: '',
      columns: [],
      data: [],
      category
    };

    setUploadedFiles([...uploadedFiles, newFile]);
  };

  const updateCategory = (id: string, category: 'Base' | 'Hierarchy' | 'Lookup') => {
    // Check if category already exists
    const hasCategory = uploadedFiles.some(f => f.category === category && f.id !== id);
    
    if ((category === 'Base' || category === 'Hierarchy') && hasCategory) {
      // Show error or handle duplicate category
      console.error(`${category} file already exists`);
      return;
    }

    setUploadedFiles(uploadedFiles.map(f => 
      f.id === id ? { ...f, category } : f
    ));
  };

  const removeFile = (id: string) => {
    setUploadedFiles(uploadedFiles.filter(f => f.id !== id));
  };

  return (
    <Card className="bg-gray-50 rounded-xl p-6 shadow-sm border border-gray-200">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-3">
          <Upload className="h-5 w-5 text-indigo-600" />
          <h3 className="text-xl font-semibold text-slate-800">File Configuration</h3>
        </div>
        <Button
          onClick={addNewRow}
          variant="outline"
          className="rounded-full hover:bg-gray-100 transition"
        >
          <Upload className="h-4 w-4 mr-2" />
          Add File
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                File
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {uploadedFiles.map((file) => (
              <tr key={file.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="relative">
                    <select
                      value={file.category}
                      onChange={(e) => updateCategory(file.id, e.target.value as 'Base' | 'Hierarchy' | 'Lookup')}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="Base">Base</option>
                      <option value="Hierarchy">Hierarchy</option>
                      <option value="Lookup">Lookup</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {file.name ? (
                      <span className="text-sm text-gray-900">{file.name}</span>
                    ) : (
                      <Button
                        onClick={() => {
                          if (fileInputRef.current) {
                            fileInputRef.current.setAttribute('data-row-id', file.id);
                            fileInputRef.current.click();
                          }
                        }}
                        variant="outline"
                        size="sm"
                        className="rounded-md"
                      >
                        Choose File
                      </Button>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {file.name ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <Check className="h-4 w-4 mr-1" />
                      Success
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      No File
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Button
                    onClick={() => removeFile(file.id)}
                    variant="outline"
                    size="sm"
                    className="rounded-full text-red-600 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {uploadedFiles.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                  No files uploaded yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx"
        onChange={(e) => {
          const rowId = e.target.getAttribute('data-row-id');
          const category = uploadedFiles.find(f => f.id === rowId)?.category || 'Base';
          handleFileUpload(e, category, rowId || undefined);
        }}
        className="hidden"
      />
    </Card>
  );
}