import React, { useState, useRef } from 'react';
import { format } from 'date-fns';
import { Plus, Save, Edit2, X, FileUp, Calculator, Upload, AlertCircle, Check, Table } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { useAuthStore } from '../store/authStore';
import * as XLSX from 'xlsx';

type Mode = 'initial' | 'new' | 'view' | 'edit';

interface FileRow {
  category: 'Base' | 'Hierarchy' | 'Lookup';
  filename?: string;
  fields?: string[];
}

interface BaseDataMapping {
  agentField: string;
  txnIdField: string;
  txnDateField: string;
  amountField: string;
}

interface GlobalVariable {
  id: string;
  name: string;
  description: string;
  dataType: string;
}

interface QualificationRule {
  id: string;
  kpiName: string;
  description: string;
  sourceField: string;
  valueType: 'Fixed' | 'Lookup';
  evaluationLevel: 'Per Record' | 'Per Agent';
  aggregation: 'Sum' | 'Average' | 'Min' | 'Max' | 'N/A';
}

interface AdjustmentRule {
  id: string;
  kpiName: string;
  description: string;
  conditionField: string;
  operator: string;
  adjustWhat: string;
  direction: 'Increase' | 'Decrease';
  type: 'Fixed' | 'Percentage';
  valueType: 'Fixed' | 'Lookup';
}

const OPERATORS = ["=", "!=", "<", "<=", ">", ">=", "CONTAINS"];

export default function KpiConfigurator() {
  try {
    // State declarations
    const [mode, setMode] = useState<Mode>('initial');
    const [kpiIdentifier, setKpiIdentifier] = useState('');
    const [kpiIdentifierError, setKpiIdentifierError] = useState('');
    const [schId, setSchId] = useState('');
    const [hasChanges, setHasChanges] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [globalError, setGlobalError] = useState('');
    const [activeSection, setActiveSection] = useState('base');
    const [uploadedFiles, setUploadedFiles] = useState<FileRow[]>([]);
    const [uploadStatus, setUploadStatus] = useState<string[]>([]);
    const [baseDataMapping, setBaseDataMapping] = useState<BaseDataMapping>({
      agentField: '',
      txnIdField: '',
      txnDateField: '',
      amountField: ''
    });
    const [config, setConfig] = useState({
      baseField: '',
      baseData: [],
      qualificationFields: [],
      adjustmentFields: [],
      exclusionFields: [],
      creditFields: []
    });
    const [globalVariables, setGlobalVariables] = useState<GlobalVariable[]>([
      { id: crypto.randomUUID(), name: "RTAMT", description: "Row total", dataType: "Currency" },
      { id: crypto.randomUUID(), name: "ATAMT", description: "Adjusted total", dataType: "Currency" }
    ]);
    const [qualificationRules, setQualificationRules] = useState<QualificationRule[]>([
      {
        id: crypto.randomUUID(),
        kpiName: "HighValueTxn",
        description: "High value transactions",
        sourceField: "Amount",
        valueType: "Fixed",
        evaluationLevel: "Per Record",
        aggregation: "N/A"
      }
    ]);

    const [adjustmentRules, setAdjustmentRules] = useState<AdjustmentRule[]>([
      {
        id: crypto.randomUUID(),
        kpiName: "CancelledTxn",
        description: "Reduce RTAMT if ReturnReason is Cancelled",
        conditionField: "ReturnReason",
        operator: "CONTAINS",
        adjustWhat: "RTAMT",
        direction: "Decrease",
        type: "Fixed",
        valueType: "Fixed"
      }
    ]);

    const DATA_TYPES = ["Currency", "Boolean", "Date", "Integer", "Percent", "String"];

    // Refs
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Derived state
    const hasRequiredFiles = uploadedFiles.some(f => f.category === 'Base' && uploadStatus[uploadedFiles.indexOf(f)] === 'success') &&
                            uploadedFiles.some(f => f.category === 'Hierarchy' && uploadStatus[uploadedFiles.indexOf(f)] === 'success');

    const baseFileFields = uploadedFiles.find(f => f.category === 'Base')?.fields || [];

    // Helper functions
    const validateKpiIdentifier = (value: string): boolean => {
      if (!value) {
        setKpiIdentifierError('KPI Identifier is required');
        return false;
      }
      if (!/^[a-zA-Z0-9]{1,10}$/.test(value)) {
        setKpiIdentifierError('Only alphanumeric characters allowed (max 10 chars)');
        return false;
      }
      setKpiIdentifierError('');
      return true;
    };

    const addGlobalVariable = () => {
      setGlobalVariables(prev => [
        ...prev,
        { id: crypto.randomUUID(), name: "", description: "", dataType: "String" }
      ]);
      setHasChanges(true);
    };

    const updateGlobalVariable = (id: string, updates: Partial<GlobalVariable>) => {
      setGlobalVariables(prev => 
        prev.map(variable => 
          variable.id === id ? { ...variable, ...updates } : variable
        )
      );
      setHasChanges(true);
    };

    const removeGlobalVariable = (id: string) => {
      setGlobalVariables(prev => prev.filter(variable => variable.id !== id));
      setHasChanges(true);
    };

    const handleUpload = (rowIndex: number, file: File, category: string) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target!.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          
          const sheetName = workbook.SheetNames[0];
          if (!sheetName) {
            throw new Error('No worksheet found in Excel file');
          }
          
          const worksheet = workbook.Sheets[sheetName];
          const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
          const headers: string[] = [];
          
          for (let C = range.s.c; C <= range.e.c; ++C) {
            const cell = worksheet[XLSX.utils.encode_cell({ r: 0, c: C })];
            headers.push(cell ? String(cell.v).trim() : '');
          }

          const validHeaders = headers.filter(Boolean);
          if (validHeaders.length === 0) {
            throw new Error('No valid headers found in Excel file');
          }

          setUploadedFiles((prev) => {
            const updated = [...prev];
            updated[rowIndex] = {
              category,
              filename: file.name,
              fields: validHeaders,
            };
            return updated;
          });

          setUploadStatus((prev) => {
            const updated = [...prev];
            updated[rowIndex] = "success";
            return updated;
          });

          setHasChanges(true);

        } catch (error) {
          console.error("Error reading Excel:", error);
          setUploadStatus((prev) => {
            const updated = [...prev];
            updated[rowIndex] = "error";
            return updated;
          });
        }
      };

      reader.onerror = () => {
        console.error("FileReader error");
        setUploadStatus((prev) => {
          const updated = [...prev];
          updated[rowIndex] = "error";
          return updated;
        });
      };

      reader.readAsArrayBuffer(file);
    };

    const handleFileLoad = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const loadedConfig = JSON.parse(e.target?.result as string);
          console.log('Loaded KPI config:', loadedConfig);
          
          setConfig(loadedConfig);
          setMode('view');
          setGlobalError('');
          setSuccessMessage('Configuration loaded successfully');
          setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
          console.error('Error parsing KPI config:', err);
          setGlobalError('Failed to parse configuration file');
        }
      };
      reader.readAsText(file);
    };

    const handleSave = () => {
      if (mode === 'new' && !validateKpiIdentifier(kpiIdentifier)) {
        return;
      }

      const configToSave = {
        ...config,
        files: uploadedFiles,
        baseDataMapping
      };

      const jsonStr = JSON.stringify(configToSave, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `kpi_config_${format(new Date(), 'yyyyMMdd_HHmmss')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setSuccessMessage('Configuration saved successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    };

    // Render functions
    const renderBaseDataMapping = () => (
      <Card className="bg-gray-50 rounded-xl p-6 shadow-sm border border-gray-200">
        <h3 className="text-xl font-semibold text-slate-800 mb-6">Base Data Mapping</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Commission Agent</label>
            <select
              value={baseDataMapping.agentField}
              onChange={(e) => {
                setBaseDataMapping(prev => ({ ...prev, agentField: e.target.value }));
                setHasChanges(true);
              }}
              disabled={mode === 'view' || !baseFileFields.length}
              className="w-full rounded-md border border-gray-300 shadow-inner px-3 py-2 focus:ring focus:outline-none disabled:bg-gray-50"
            >
              <option value="">Select field</option>
              {baseFileFields.map(field => (
                <option key={field} value={field}>{field}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Commission TxnID</label>
            <select
              value={baseDataMapping.txnIdField}
              onChange={(e) => {
                setBaseDataMapping(prev => ({ ...prev, txnIdField: e.target.value }));
                setHasChanges(true);
              }}
              disabled={mode === 'view' || !baseFileFields.length}
              className="w-full rounded-md border border-gray-300 shadow-inner px-3 py-2 focus:ring focus:outline-none disabled:bg-gray-50"
            >
              <option value="">Select field</option>
              {baseFileFields.map(field => (
                <option key={field} value={field}>{field}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Commission TxnDate</label>
            <select
              value={baseDataMapping.txnDateField}
              onChange={(e) => {
                setBaseDataMapping(prev => ({ ...prev, txnDateField: e.target.value }));
                setHasChanges(true);
              }}
              disabled={mode === 'view' || !baseFileFields.length}
              className="w-full rounded-md border border-gray-300 shadow-inner px-3 py-2 focus:ring focus:outline-none disabled:bg-gray-50"
            >
              <option value="">Select field</option>
              {baseFileFields.map(field => (
                <option key={field} value={field}>{field}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Commission Amount</label>
            <select
              value={baseDataMapping.amountField}
              onChange={(e) => {
                setBaseDataMapping(prev => ({ ...prev, amountField: e.target.value }));
                setHasChanges(true);
              }}
              disabled={mode === 'view' || !baseFileFields.length}
              className="w-full rounded-md border border-gray-300 shadow-inner px-3 py-2 focus:ring focus:outline-none disabled:bg-gray-50"
            >
              <option value="">Select field</option>
              {baseFileFields.map(field => (
                <option key={field} value={field}>{field}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>
    );

    const renderFileTable = () => (
      <Card className="bg-gray-50 rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-3">
            <Table className="h-6 w-6 text-indigo-600" />
            <h3 className="text-xl font-semibold text-slate-800">File Configuration</h3>
          </div>
          {mode !== 'view' && (
            <Button
              onClick={() => {
                setUploadedFiles(prev => [...prev, { category: 'Lookup' }]);
                setUploadStatus(prev => [...prev, '']);
              }}
              variant="outline"
              className="rounded-full hover:bg-gray-100 transition"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add File
            </Button>
          )}
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
                {mode !== 'view' && (
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {uploadedFiles.map((file, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={file.category}
                      onChange={(e) => {
                        const updated = [...uploadedFiles];
                        updated[index] = { ...file, category: e.target.value as FileRow['category'] };
                        setUploadedFiles(updated);
                      }}
                      disabled={mode === 'view'}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                      <option value="Base">Base</option>
                      <option value="Hierarchy">Hierarchy</option>
                      <option value="Lookup">Lookup</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleUpload(index, file, uploadedFiles[index].category);
                        }
                      }}
                      disabled={mode === 'view'}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {uploadStatus[index] === 'success' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <Check className="h-4 w-4 mr-1" />
                        Success
                      </span>
                    )}
                    {uploadStatus[index] === 'error' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        Error
                      </span>
                    )}
                  </td>
                  {mode !== 'view' && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Button
                        onClick={() => {
                          setUploadedFiles(files => files.filter((_, i) => i !== index));
                          setUploadStatus(status => status.filter((_, i) => i !== index));
                        }}
                        variant="outline"
                        size="sm"
                        className="rounded-full text-red-600 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    );

    const renderGlobalVariables = () => (
      <Card className="bg-gray-50 rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-slate-800">Global Variables</h3>
          {mode !== 'view' && (
            <Button
              onClick={() => setGlobalVariables(prev => [
                ...prev,
                { id: crypto.randomUUID(), name: "", description: "", dataType: "String" }
              ])}
              variant="outline"
              className="rounded-full hover:bg-gray-100 transition"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Variable
            </Button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Variable Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data Type
                </th>
                {mode !== 'view' && (
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {globalVariables.map((variable) => (
                <tr key={variable.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="text"
                      value={variable.name}
                      onChange={(e) => updateGlobalVariable(variable.id, { name: e.target.value })}
                      disabled={mode === 'view'}
                      className="w-full rounded-md border border-gray-300 shadow-inner px-3 py-2 focus:ring focus:outline-none disabled:bg-gray-50"
                      placeholder="Enter variable name"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="text"
                      value={variable.description}
                      onChange={(e) => updateGlobalVariable(variable.id, { description: e.target.value.slice(0, 20) })}
                      disabled={mode === 'view'}
                      className="w-full rounded-md border border-gray-300 shadow-inner px-3 py-2 focus:ring focus:outline-none disabled:bg-gray-50"
                      placeholder="Enter description"
                      maxLength={20}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={variable.dataType}
                      onChange={(e) => updateGlobalVariable(variable.id, { dataType: e.target.value })}
                      disabled={mode === 'view'}
                      className="w-full rounded-md border border-gray-300 shadow-inner px-3 py-2 focus:ring focus:outline-none disabled:bg-gray-50"
                    >
                      {DATA_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </td>
                  {mode !== 'view' && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Button
                        onClick={() => removeGlobalVariable(variable.id)}
                        variant="outline"
                        size="sm"
                        className="rounded-full text-red-600 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    );

    const renderQualificationRules = () => (
      <Card className="bg-gray-50 rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-slate-800">Qualification KPI's</h3>
          {mode !== 'view' && (
            <Button
              onClick={() => setQualificationRules(prev => [...prev, {
                id: crypto.randomUUID(),
                kpiName: "",
                description: "",
                sourceField: "",
                valueType: "Fixed",
                evaluationLevel: "Per Record",
                aggregation: "N/A"
              }])}
              variant="outline"
              className="rounded-full hover:bg-gray-100 transition"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Qualification KPI
            </Button>
          )}
        </div>

        <div className="space-y-4">
          {qualificationRules.map((rule) => (
            <div key={rule.id} className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">KPI Name</label>
                  <input
                    type="text"
                    value={rule.kpiName}
                    onChange={(e) => setQualificationRules(prev =>
                      prev.map(r => r.id === rule.id ? { ...r, kpiName: e.target.value } : r)
                    )}
                    disabled={mode === 'view'}
                    className="w-full rounded-md border border-gray-300 shadow-inner px-3 py-2 focus:ring focus:outline-none disabled:bg-gray-50"
                    placeholder="Enter KPI name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <input
                    type="text"
                    value={rule.description}
                    onChange={(e) => setQualificationRules(prev =>
                      prev.map(r => r.id === rule.id ? { ...r, description: e.target.value } : r)
                    )}
                    disabled={mode === 'view'}
                    className="w-full rounded-md border border-gray-300 shadow-inner px-3 py-2 focus:ring focus:outline-none disabled:bg-gray-50"
                    placeholder="Enter description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Source Field</label>
                  <select
                    value={rule.sourceField}
                    onChange={(e) => setQualificationRules(prev =>
                      prev.map(r => r.id === rule.id ? { ...r, sourceField: e.target.value } : r)
                    )}
                    disabled={mode === 'view'}
                    className="w-full rounded-md border border-gray-300 shadow-inner px-3 py-2 focus:ring focus:outline-none disabled:bg-gray-50"
                  >
                    <option value="">Select field</option>
                    {uploadedFiles.find(f => f.category === 'Base')?.fields?.map(field => (
                      <option key={field} value={field}>{field}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Value Type</label>
                  <select
                    value={rule.valueType}
                    onChange={(e) => setQualificationRules(prev =>
                      prev.map(r => r.id === rule.id ? { ...r, valueType: e.target.value as 'Fixed' | 'Lookup' } : r)
                    )}
                    disabled={mode === 'view'}
                    className="w-full rounded-md border border-gray-300 shadow-inner px-3 py-2 focus:ring focus:outline-none disabled:bg-gray-50"
                  >
                    <option value="Fixed">Fixed</option>
                    <option value="Lookup">Lookup</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Evaluation Level</label>
                  <select
                    value={rule.evaluationLevel}
                    onChange={(e) => {
                      const newLevel = e.target.value as 'Per Record' | 'Per Agent';
                      setQualificationRules(prev =>
                        prev.map(r => r.id === rule.id ? {
                          ...r,
                          evaluationLevel: newLevel,
                          aggregation: newLevel === 'Per Record' ? 'N/A' : r.aggregation
                        } : r)
                      );
                    }}
                    disabled={mode === 'view'}
                    className="w-full rounded-md border border-gray-300 shadow-inner px-3 py-2 focus:ring focus:outline-none disabled:bg-gray-50"
                  >
                    <option value="Per Record">Per Record</option>
                    <option value="Per Agent">Per Agent</option>
                  </select>
                </div>

                {rule.evaluationLevel === 'Per Agent' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Aggregation</label>
                    <select
                      value={rule.aggregation}
                      onChange={(e) => setQualificationRules(prev =>
                        prev.map(r => r.id === rule.id ? {
                          ...r,
                          aggregation: e.target.value as 'Sum' | 'Average' | 'Min' | 'Max' | 'N/A'
                        } : r)
                      )}
                      disabled={mode === 'view'}
                      className="w-full rounded-md border border-gray-300 shadow-inner px-3 py-2 focus:ring focus:outline-none disabled:bg-gray-50"
                    >
                      <option value="Sum">Sum</option>
                      <option value="Average">Average</option>
                      <option value="Min">Min</option>
                      <option value="Max">Max</option>
                    </select>
                  </div>
                )}

                {mode !== 'view' && (
                  <div className="col-span-2 flex justify-end">
                    <Button
                      onClick={() => setQualificationRules(prev => prev.filter(r => r.id !== rule.id))}
                      variant="outline"
                      size="sm"
                      className="rounded-full text-red-600 hover:text-red-700"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Remove KPI
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {qualificationRules.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              No qualification KPIs defined yet
            </div>
          )}
        </div>
      </Card>
    );

    const renderAdjustmentRules = () => (
      <Card className="bg-gray-50 rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-slate-800">Adjustment KPI's</h3>
          {mode !== 'view' && (
            <Button
              onClick={() => setAdjustmentRules(prev => [...prev, {
                id: crypto.randomUUID(),
                kpiName: "",
                description: "",
                conditionField: "",
                operator: "=",
                adjustWhat: "",
                direction: "Increase",
                type: "Fixed",
                valueType: "Fixed"
              }])}
              variant="outline"
              className="rounded-full hover:bg-gray-100 transition"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Adjustment KPI
            </Button>
          )}
        </div>

        <div className="space-y-4">
          {adjustmentRules.map((rule) => (
            <div key={rule.id} className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">KPI Name</label>
                  <input
                    type="text"
                    value={rule.kpiName}
                    onChange={(e) => setAdjustmentRules(prev =>
                      prev.map(r => r.id === rule.id ? { ...r, kpiName: e.target.value } : r)
                    )}
                    disabled={mode === 'view'}
                    className="w-full rounded-md border border-gray-300 shadow-inner px-3 py-2 focus:ring focus:outline-none disabled:bg-gray-50"
                    placeholder="Enter KPI name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <input
                    type="text"
                    value={rule.description}
                    onChange={(e) => setAdjustmentRules(prev =>
                      prev.map(r => r.id === rule.id ? { ...r, description: e.target.value } : r)
                    )}
                    disabled={mode === 'view'}
                    className="w-full rounded-md border border-gray-300 shadow-inner px-3 py-2 focus:ring focus:outline-none disabled:bg-gray-50"
                    placeholder="Enter description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Condition Field</label>
                  <select
                    value={rule.conditionField}
                    onChange={(e) => setAdjustmentRules(prev =>
                      prev.map(r => r.id === rule.id ? { ...r, conditionField: e.target.value } : r)
                    )}
                    disabled={mode === 'view'}
                    className="w-full rounded-md border border-gray-300 shadow-inner px-3 py-2 focus:ring focus:outline-none disabled:bg-gray-50"
                  >
                    <option value="">Select field</option>
                    {uploadedFiles.find(f => f.category === 'Base')?.fields?.map(field => (
                      <option key={field} value={field}>{field}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Operator</label>
                  <select
                    value={rule.operator}
                    onChange={(e) => setAdjustmentRules(prev =>
                      prev.map(r => r.id === rule.id ? { ...r, operator: e.target.value } : r)
                    )}
                    disabled={mode === 'view'}
                    className="w-full rounded-md border border-gray-300 shadow-inner px-3 py-2 focus:ring focus:outline-none disabled:bg-gray-50"
                  >
                    {OPERATORS.map(op => (
                      <option key={op} value={op}>{op}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Adjust What</label>
                  <select
                    value={rule.adjustWhat}
                    onChange={(e) => setAdjustmentRules(prev =>
                      prev.map(r => r.id === rule.id ? { ...r, adjustWhat: e.target.value } : r)
                    )}
                    disabled={mode === 'view'}
                    className="w-full rounded-md border border-gray-300 shadow-inner px-3 py-2 focus:ring focus:outline-none disabled:bg-gray-50"
                  >
                    <option value="">Select variable</option>
                    {globalVariables.map(variable => (
                      <option key={variable.id} value={variable.name}>{variable.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Direction</label>
                  <select
                    value={rule.direction}
                    onChange={(e) => setAdjustmentRules(prev =>
                      prev.map(r => r.id === rule.id ? { ...r, direction: e.target.value as 'Increase' | 'Decrease' } : r)
                    )}
                    disabled={mode === 'view'}
                    className="w-full rounded-md border border-gray-300 shadow-inner px-3 py-2 focus:ring focus:outline-none disabled:bg-gray-50"
                  >
                    <option value="Increase">Increase</option>
                    <option value="Decrease">Decrease</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={rule.type}
                    onChange={(e) => setAdjustmentRules(prev =>
                      prev.map(r => r.id === rule.id ? { ...r, type: e.target.value as 'Fixed' | 'Percentage' } : r)
                    )}
                    disabled={mode === 'view'}
                    className="w-full rounded-md border border-gray-300 shadow-inner px-3 py-2 focus:ring focus:outline-none disabled:bg-gray-50"
                  >
                    <option value="Fixed">Fixed</option>
                    <option value="Percentage">Percentage</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Value Type</label>
                  <select
                    value={rule.valueType}
                    onChange={(e) => setAdjustmentRules(prev =>
                      prev.map(r => r.id === rule.id ? { ...r, valueType: e.target.value as 'Fixed' | 'Lookup' } : r)
                    )}
                    disabled={mode === 'view'}
                    className="w-full rounded-md border border-gray-300 shadow-inner px-3 py-2 focus:ring focus:outline-none disabled:bg-gray-50"
                  >
                    <option value="Fixed">Fixed</option>
                    <option value="Lookup">Lookup</option>
                  </select>
                </div>

                {mode !== 'view' && (
                  <div className="col-span-2 flex justify-end">
                    <Button
                      onClick={() => setAdjustmentRules(prev => prev.filter(r => r.id !== rule.id))}
                      variant="outline"
                      size="sm"
                      className="rounded-full text-red-600 hover:text-red-700"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Remove KPI
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {adjustmentRules.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              No adjustment KPIs defined yet
            </div>
          )}
        </div>
      </Card>
    );

    // Main render
    if (mode === 'initial') {
      return (
        <div className="max-w-5xl mx-auto py-12 px-4">
          <Card className="bg-gray-50 rounded-xl p-12 shadow-sm border border-gray-200">
            <div className="text-center space-y-6">
              <h1 className="text-3xl font-semibold text-slate-800">KPI Configuration</h1>
              <p className="text-slate-600">Create or manage your KPI configurations</p>
              
              <div className="max-w-sm mx-auto space-y-4 pt-6">
                <Button
                  onClick={() => {
                    setMode('new');
                    setConfig({
                      baseField: '',
                      baseData: [],
                      qualificationFields: [],
                      adjustmentFields: [],
                      exclusionFields: [],
                      creditFields: []
                    });
                    setGlobalError('');
                  }}
                  className="w-full rounded-full bg-black text-white hover:opacity-90 transition py-6"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Create New Configuration
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full rounded-full border-2 hover:bg-gray-100 transition py-6"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileUp className="h-5 w-5 mr-2" />
                  View Existing Configuration
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileLoad}
                  className="hidden"
                />
              </div>
            </div>
          </Card>
        </div>
      );
    }

    return (
      <div className="max-w-5xl mx-auto py-12 px-4 space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-semibold text-slate-800">
            {mode === 'new' ? 'Create New KPI Configuration' : 'View KPI Configuration'}
          </h1>
          <div className="flex space-x-3">
            {mode === 'view' && (
              <Button 
                onClick={() => setMode('edit')} 
                variant="outline"
                className="rounded-full hover:bg-gray-100 transition"
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Edit Configuration
              </Button>
            )}
            {(mode === 'edit' || mode === 'new') && hasChanges && (
              <Button 
                onClick={handleSave}
                className="rounded-full bg-black text-white hover:opacity-90 transition"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Configuration
              </Button>
            )}
          </div>
        </div>

        {successMessage && (
          <Card className="bg-green-50 border-green-200 p-4">
            <div className="flex items-center text-green-700">
              <Check className="h-5 w-5 mr-2" />
              {successMessage}
            </div>
          </Card>
        )}

        {globalError && (
          <Card className="bg-red-50 border-red-200 p-4">
            <div className="flex items-center text-red-700">
              <AlertCircle className="h-5 w-5 mr-2" />
              {globalError}
            </div>
          </Card>
        )}

        <Card className="bg-gray-50 rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {mode === 'new' ? (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  KPI Identifier (10 chars max)
                </label>
                <input
                  type="text"
                  value={kpiIdentifier}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^a-zA-Z0-9]/g, '');
                    setKpiIdentifier(value.slice(0, 10));
                    validateKpiIdentifier(value);
                  }}
                  className={`w-full rounded-md border ${
                    kpiIdentifierError ? 'border-red-300' : 'border-gray-300'
                  } shadow-inner px-3 py-2 focus:ring focus:outline-none`}
                  placeholder="Enter identifier"
                />
                {kpiIdentifierError && (
                  <p className="mt-1 text-sm text-red-600">{kpiIdentifierError}</p>
                )}
              </div>
            ) : schId && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  KPI ID
                </label>
                <div className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-gray-700">
                  {schId}
                </div>
              </div>
            )}
          </div>
        </Card>

        {renderFileTable()}

        {!hasRequiredFiles && (
          <Card className="bg-yellow-50 p-4 rounded-xl border border-yellow-200">
            <div className="flex items-center text-yellow-800">
              <AlertCircle className="h-5 w-5 mr-2" />
              <p>Please upload Base and Hierarchy files to proceed with KPI configuration.</p>
            </div>
          </Card>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1">
          <Tabs 
            value={activeSection} 
            onValueChange={setActiveSection}
            className="w-full"
          >
            <TabsList className="w-full justify-start bg-gray-50 p-1 rounded-lg">
              <TabsTrigger value="base" className="rounded-md" disabled={!hasRequiredFiles}>Base Data</TabsTrigger>
              <TabsTrigger value="qualification" className="rounded-md" disabled={!hasRequiredFiles}>Qualification KPI's</TabsTrigger>
              <TabsTrigger value="adjustment" className="rounded-md" disabled={!hasRequiredFiles}>Adjustment KPI's</TabsTrigger>
              <TabsTrigger value="exclusion" className="rounded-md" disabled={!hasRequiredFiles}>Exclusion KPI's</TabsTrigger>
              <TabsTrigger value="credit" className="rounded-md" disabled={!hasRequiredFiles}>Hierarchy Credit Distribution</TabsTrigger>
              <TabsTrigger value="variables" className="rounded-md" disabled={!hasRequiredFiles}>Global Variables</TabsTrigger>
            </TabsList>

            <div className="p-6">
              <TabsContent value="base">
                {renderBaseDataMapping()}
              </TabsContent>

              <TabsContent value="qualification">
                {renderQualificationRules()}
              </TabsContent>

              <TabsContent value="adjustment">
                {renderAdjustmentRules()}
              </TabsContent>

              <TabsContent value="exclusion">
                {/* Exclusion KPI's section */}
              </TabsContent>

              <TabsContent value="credit">
                {/* Hierarchy Credit Distribution section */}
              </TabsContent>

              <TabsContent value="variables">
                {renderGlobalVariables()}
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    );

  } catch (error) {
    console.error("Error inside KpiConfigurator:", error);
    return (
      <div className="p-4 bg-red-50 rounded-lg border border-red-200">
        <div className="flex items-center text-red-700">
          <AlertCircle className="h-5 w-5 mr-2" />
          <div>
            <h3 className="font-medium">Error loading KPI Configurator</h3>
            <p className="text-sm mt-1">Please check the console for details.</p>
          </div>
        </div>
      </div>
    );
  }
}

export { KpiConfigurator }