import React, { useState, useRef, useCallback } from 'react';
import { Upload, AlertCircle, Check, X, FileUp, Calendar, Play, Beaker } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { format, isWithinInterval, parseISO, isValid } from 'date-fns';
import { runScheme } from '../runtime/schemes/runScheme';
import { useNavigate } from 'react-router-dom';
import { validateSchemeJson } from '../utils/schemeValidation';
import { parseExcelFile } from '../utils/excelParser';

interface ValidationError {
  type: 'error' | 'warning';
  message: string;
  details: string[];
}

interface SchemeData {
  id?: string;
  name: string;
  description: string;
  effectiveFrom: string;
  effectiveTo: string;
  quotaAmount: number;
  revenueBase: string;
  baseMapping: {
    sourceFile: string;
    agentField: string;
    amountField: string;
    transactionDateField: string;
  };
  kpiConfig: {
    calculationBase: string;
    baseField: string;
    baseData: Array<{
      id: string;
      name: string;
      description: string;
      sourceType: string;
      sourceField: string;
      dataType: string;
      evaluationLevel: string;
      aggregation: string;
      sourceFile?: string;
    }>;
    qualificationFields: Array<{
      id: string;
      name: string;
      description: string;
      sourceType: string;
      sourceField: string;
      dataType: string;
      evaluationLevel: string;
      aggregation: string;
      sourceFile?: string;
    }>;
    adjustmentFields: Array<any>;
    exclusionFields: Array<any>;
    creditFields: Array<any>;
  };
  creditHierarchyFile?: string;
}

interface ExecutionResult {
  success: boolean;
  message: string;
  data?: any;
  errors?: string[];
}

export function SchemeExecution() {
  const navigate = useNavigate();
  const schemeFileInputRef = useRef<HTMLInputElement>(null);
  const dataFileInputRef = useRef<HTMLInputElement>(null);
  const [selectedScheme, setSelectedScheme] = useState<SchemeData | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, ArrayBuffer>>({});
  const [requiredFiles, setRequiredFiles] = useState<Set<string>>(new Set());
  const [runAsOfDate, setRunAsOfDate] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);

  const resetState = useCallback(() => {
    setSelectedScheme(null);
    setValidationErrors([]);
    setUploadedFiles({});
    setRequiredFiles(new Set());
    setRunAsOfDate('');
    setIsExecuting(false);
    setExecutionResult(null);
  }, []);

  const getRequiredFiles = useCallback((scheme: SchemeData): Set<string> => {
    const files = new Set<string>();
    
    if (scheme.baseMapping?.sourceFile) {
      files.add(scheme.baseMapping.sourceFile);
    }
    
    if (scheme.kpiConfig) {
      const addFields = (configFields: any[], source: string) => {
        configFields.forEach(field => {
          if (field.sourceType === 'External' && field.sourceFile) {
            files.add(field.sourceFile);
          }
        });
      };

      addFields(scheme.kpiConfig.baseData, 'Base Data');
      addFields(scheme.kpiConfig.qualificationFields, 'Qualification');
      addFields(scheme.kpiConfig.adjustmentFields, 'Adjustment');
      addFields(scheme.kpiConfig.exclusionFields, 'Exclusion');
      if (scheme.kpiConfig.creditFields) {
        addFields(scheme.kpiConfig.creditFields, 'Credit');
      }
    }

    if (scheme.creditHierarchyFile) {
      files.add(scheme.creditHierarchyFile);
    }

    return files;
  }, []);

  const handleSchemeUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const scheme = JSON.parse(e.target?.result as string);
          console.log('Loaded scheme:', scheme);
          
          resetState();
          
          const validation = validateSchemeJson(scheme);
          setValidationErrors(validation.errors);
          
          if (validation.valid) {
            setSelectedScheme(scheme);
            const required = getRequiredFiles(scheme);
            setRequiredFiles(required);
          }
        } catch (err) {
          console.error('Error parsing scheme:', err);
          setValidationErrors([{
            type: 'error',
            message: 'Failed to parse scheme file',
            details: [err instanceof Error ? err.message : 'Invalid format']
          }]);
        }
      };

      reader.onerror = () => {
        setValidationErrors([{
          type: 'error',
          message: 'Failed to read file',
          details: ['Please check the file and try again']
        }]);
      };

      reader.readAsText(file);
    }
  };

  const handleDataUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !selectedScheme) return;

    const newFiles: Record<string, ArrayBuffer> = { ...uploadedFiles };
    const newErrors: ValidationError[] = [];

    for (const file of Array.from(files)) {
      if (!file.name.endsWith('.xlsx')) {
        newErrors.push({
          type: 'error',
          message: `Invalid file type: ${file.name}`,
          details: ['Only Excel (.xlsx) files are supported']
        });
        continue;
      }

      try {
        const buffer = await file.arrayBuffer();
        newFiles[file.name] = buffer;
      } catch (err) {
        console.error(`Error reading Excel file ${file.name}:`, err);
        newErrors.push({
          type: 'error',
          message: `Failed to read Excel file: ${file.name}`,
          details: [err instanceof Error ? err.message : 'Invalid format']
        });
      }
    }

    setUploadedFiles(newFiles);
    setValidationErrors(prev => [...prev, ...newErrors]);
  };

  const isReadyToExecute = useCallback(() => {
    if (!selectedScheme || !runAsOfDate) return false;

    const allFilesUploaded = Array.from(requiredFiles).every(file => file in uploadedFiles);
    if (!allFilesUploaded) return false;

    try {
      const runDate = parseISO(runAsOfDate);
      if (!isValid(runDate)) return false;

      const isValidDate = isWithinInterval(runDate, {
        start: parseISO(selectedScheme.effectiveFrom),
        end: parseISO(selectedScheme.effectiveTo)
      });
      return isValidDate;
    } catch {
      return false;
    }
  }, [selectedScheme, runAsOfDate, requiredFiles, uploadedFiles]);

  const handleExecute = async (mode: 'simulation' | 'production') => {
    if (!isReadyToExecute() || isExecuting || !selectedScheme) return;
    
    setIsExecuting(true);
    setExecutionResult(null);
    
    try {
      console.log('[Execution] Running scheme with runScheme function');
      console.log('[Execution] Input data:', {
        scheme: selectedScheme,
        files: Object.keys(uploadedFiles),
        runDate: runAsOfDate
      });

      const result = await runScheme(selectedScheme, uploadedFiles, runAsOfDate);
      console.log('[Execution] Result:', result);

      const executionResult = {
        success: true,
        message: `Scheme executed successfully in ${mode} mode`,
        data: {
          totalRecords: result?.rawRecordLevelData?.length ?? 0,
          processedAt: new Date().toISOString(),
          summary: {
            totalAgents: Object.keys(result?.agentPayouts ?? {}).length,
            qualified: Object.values(result?.agentPayouts ?? {}).filter(p => parseFloat(String(p)) > 0).length,
            totalPayout: Object.values(result?.agentPayouts ?? {}).reduce((sum, p) => sum + parseFloat(String(p)), 0)
          },
          agents: Object.entries(result?.agentPayouts ?? {}).map(([agentId, payout]) => ({
            agentId,
            qualified: parseFloat(String(payout)) > 0,
            commission: parseFloat(String(payout))
          })),
          executionSteps: result.executionSteps || [],
          rawRecordLevelData: result.rawRecordLevelData || []
        }
      };

      setExecutionResult(executionResult);
      navigate('/execution/results', { state: { result: executionResult } });
    } catch (error) {
      console.error('[Execution] Failed:', error);
      setExecutionResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown execution error',
        errors: [error instanceof Error ? error.message : 'Unknown error occurred']
      });
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-12 px-4 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-semibold text-slate-800">Scheme Execution</h1>
      </div>

      <Card className="bg-gray-50 rounded-xl p-6 shadow-sm border border-gray-200">
        <h2 className="text-xl font-semibold text-slate-800 mb-6">Upload Scheme JSON</h2>
        
        {selectedScheme ? (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <dl className="grid grid-cols-2 gap-6">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Scheme Name</dt>
                  <dd className="mt-1 text-lg text-gray-900">{selectedScheme.name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Calculation Base</dt>
                  <dd className="mt-1 text-lg text-gray-900">{selectedScheme.kpiConfig.calculationBase}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Effective From</dt>
                  <dd className="mt-1 text-lg text-gray-900">
                    {format(parseISO(selectedScheme.effectiveFrom), 'MMMM d, yyyy')}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Effective To</dt>
                  <dd className="mt-1 text-lg text-gray-900">
                    {format(parseISO(selectedScheme.effectiveTo), 'MMMM d, yyyy')}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Description</dt>
                  <dd className="mt-1 text-lg text-gray-900">{selectedScheme.description}</dd>
                </div>
              </dl>
            </div>

            <Button
              variant="outline"
              onClick={resetState}
              className="w-full rounded-full hover:bg-gray-100 transition"
            >
              <X className="h-4 w-4 mr-2" />
              Clear Selection
            </Button>
          </div>
        ) : (
          <Button
            onClick={() => schemeFileInputRef.current?.click()}
            className="w-full rounded-full hover:bg-gray-100 transition"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Scheme JSON
          </Button>
        )}
        <input
          ref={schemeFileInputRef}
          type="file"
          accept=".json"
          onChange={handleSchemeUpload}
          className="hidden"
        />
      </Card>

      {selectedScheme && (
        <Card className="bg-gray-50 rounded-xl p-6 shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold text-slate-800 mb-6">Required Input Files</h2>
          
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      File Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Array.from(requiredFiles).map((fileName) => {
                    const isUploaded = fileName in uploadedFiles;
                    
                    return (
                      <tr key={fileName}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {fileName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isUploaded ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <Check className="h-4 w-4 mr-1" />
                              Uploaded
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              <X className="h-4 w-4 mr-1" />
                              Missing
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <Button
              onClick={() => dataFileInputRef.current?.click()}
              className="w-full rounded-full hover:bg-gray-100 transition"
            >
              <FileUp className="h-4 w-4 mr-2" />
              Upload Excel Files
            </Button>
            <input
              ref={dataFileInputRef}
              type="file"
              accept=".xlsx"
              multiple
              onChange={handleDataUpload}
              className="hidden"
            />
          </div>
        </Card>
      )}

      {selectedScheme && (
        <Card className="bg-gray-50 rounded-xl p-6 shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold text-slate-800 mb-6">Run Controls</h2>
          
          <div className="space-y-6">
            <div>
              <Label htmlFor="runDate" className="text-sm font-medium text-gray-700">Run As Of Date</Label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="date"
                  id="runDate"
                  value={runAsOfDate}
                  onChange={(e) => setRunAsOfDate(e.target.value)}
                  min={selectedScheme.effectiveFrom}
                  max={selectedScheme.effectiveTo}
                  className="block w-full pl-10 pr-3 py-2 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Button
                onClick={() => handleExecute('simulation')}
                disabled={!isReadyToExecute() || isExecuting}
                variant="outline"
                className="rounded-full hover:bg-gray-100 transition"
              >
                <Beaker className="h-4 w-4 mr-2" />
                {isExecuting ? 'Simulating...' : 'Simulate Scheme'}
              </Button>

              <Button
                onClick={() => handleExecute('production')}
                disabled={!isReadyToExecute() || isExecuting}
                className="rounded-full bg-black text-white hover:opacity-90 transition"
              >
                <Play className="h-4 w-4 mr-2" />
                {isExecuting ? 'Running...' : 'Run Production'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {executionResult && (
        <Card className="bg-gray-50 rounded-xl p-6 shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold text-slate-800 mb-6">Execution Results</h2>
          
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <dl className="grid grid-cols-2 gap-6">
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1 text-lg text-gray-900">
                  {executionResult.success ? (
                    <span className="text-green-600">Success</span>
                  ) : (
                    <span className="text-red-600">Failed</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Message</dt>
                <dd className="mt-1 text-lg text-gray-900">{executionResult.message}</dd>
              </div>
              {executionResult.data && (
                <>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Total Records</dt>
                    <dd className="mt-1 text-lg text-gray-900">{executionResult.data.totalRecords}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Processed At</dt>
                    <dd className="mt-1 text-lg text-gray-900">
                      {format(parseISO(executionResult.data.processedAt), 'PPpp')}
                    </dd>
                  </div>
                </>
              )}
            </dl>
          </div>
        </Card>
      )}

      {validationErrors.length > 0 && (
        <Card className={`p-4 ${
          validationErrors.some(e => e.type === 'error')
            ? 'bg-red-50 border-red-200'
            : 'bg-yellow-50 border-yellow-200'
        }`}>
          <div className="space-y-4">
            {validationErrors.map((error, index) => (
              <div key={index} className="flex items-start space-x-2">
                {error.type === 'error' ? (
                  <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                )}
                <div className={error.type === 'error' ? 'text-red-700' : 'text-yellow-700'}>
                  <p className="font-medium">{error.message}</p>
                  <ul className="mt-1 text-sm space-y-1">
                    {error.details.map((detail, i) => (
                      <li key={i}>• {detail}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {selectedScheme && validationErrors.every(e => e.type === 'warning') && (
        <Card className="bg-green-50 border-green-200 p-4">
          <div className="flex items-center text-green-700">
            <Check className="h-5 w-5 mr-2" />
            Scheme validation successful
          </div>
        </Card>
      )}
    </div>
  );
}