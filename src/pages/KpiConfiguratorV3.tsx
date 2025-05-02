import React, { useState } from 'react';
import { Save, Plus, X, Check, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { format } from 'date-fns';
import { useAuthStore } from '../store/authStore';
import { UploadBaseFileTab } from '../components/kpi/UploadBaseFileTab';
import { BaseDataMappingTab } from '../components/kpi/BaseDataMappingTab';
import { GlobalVariablesTab } from '../components/kpi/GlobalVariablesTab';
import { QualificationKpiTab } from '../components/kpi/QualificationKpiTab';
import { AdjustmentKpiTab } from '../components/kpi/AdjustmentKpiTab';
import { ExclusionKpiTab } from '../components/kpi/ExclusionKpiTab';
import { CreditHierarchyTab } from '../components/kpi/CreditHierarchyTab';

interface UploadedFile {
  id: string;
  name: string;
  columns: string[];
  data: any[];
  category: 'Base' | 'Hierarchy' | 'Lookup';
}

export function KpiConfiguratorV3() {
  const user = useAuthStore((state) => state.user);
  const [kpiIdentifier, setKpiIdentifier] = useState('');
  const [kpiIdentifierError, setKpiIdentifierError] = useState('');
  const [activeSection, setActiveSection] = useState('base');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [baseDataMapping, setBaseDataMapping] = useState({
    agentField: '',
    txnIdField: '',
    txnDateField: '',
    amountField: ''
  });
  const [globalVariables, setGlobalVariables] = useState([
    { id: crypto.randomUUID(), name: "RTAMT", description: "Row total", dataType: "Currency" },
    { id: crypto.randomUUID(), name: "ATAMT", description: "Adjusted total", dataType: "Currency" }
  ]);
  const [qualificationRules, setQualificationRules] = useState<any[]>([]);
  const [adjustmentRules, setAdjustmentRules] = useState<any[]>([]);
  const [exclusionRules, setExclusionRules] = useState<any[]>([]);
  const [creditHierarchy, setCreditHierarchy] = useState<any>(null);
  const [caseFileObject, setCaseFileObject] = useState<any>(null);

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

  const handleSave = () => {
    if (!validateKpiIdentifier(kpiIdentifier)) {
      return;
    }

    try {
      const baseFile = uploadedFiles.find(f => f.category === 'Base');
      const hierarchyFile = uploadedFiles.find(f => f.category === 'Hierarchy');

      const currentData = {
        baseDataMapping,
        globalVariables: globalVariables.map(v => ({
          name: v.name,
          description: v.description,
          dataType: v.dataType
        })),
        qualificationRules,
        adjustmentRules,
        exclusionRules,
        creditHierarchy,
        uploadedFiles: {
          base: baseFile ? { columns: baseFile.columns } : undefined,
          hierarchy: hierarchyFile ? { columns: hierarchyFile.columns } : undefined
        }
      };

      let updatedCaseFile;

      if (!caseFileObject) {
        updatedCaseFile = {
          caseFileId: `KPI_${format(new Date(), 'yyyyMMdd')}`,
          createdOn: new Date().toISOString(),
          createdBy: user?.username || 'unknown',
          versions: [{
            version: "1.0",
            savedOn: new Date().toISOString(),
            description: "Initial Save",
            status: "Current",
            data: currentData
          }]
        };
      } else {
        const latestVersion = caseFileObject.versions[0].version;
        const [major, minor] = latestVersion.split('.').map(Number);
        const newVersion = `${major}.${minor + 1}`;

        updatedCaseFile = {
          ...caseFileObject,
          versions: [
            {
              version: newVersion,
              savedOn: new Date().toISOString(),
              description: `Version ${newVersion} update`,
              status: "Current",
              data: currentData
            },
            ...caseFileObject.versions.map(v => ({ ...v, status: 'Deprecated' as const }))
          ]
        };
      }

      setCaseFileObject(updatedCaseFile);

      const jsonStr = JSON.stringify(updatedCaseFile, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `K_${kpiIdentifier}_${format(new Date(), 'ddMMyyyy_HHmmss')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error saving configuration:', error);
    }
  };

  // Get the base and hierarchy files for the tabs
  const baseFile = uploadedFiles.find(f => f.category === 'Base');
  const hierarchyFile = uploadedFiles.find(f => f.category === 'Hierarchy');

  // Transform the base file columns into the kpiFields format
  const kpiFields = baseFile?.columns.map(name => ({
    name,
    dataType: 'String'
  })) || [];

  return (
    <div className="max-w-5xl mx-auto py-12 px-4 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-semibold text-slate-800">Create New KPI Configuration</h1>
        <Button 
          onClick={handleSave}
          className="rounded-full bg-black text-white hover:opacity-90 transition"
        >
          <Save className="h-4 w-4 mr-2" />
          Save Configuration
        </Button>
      </div>

      <Card className="bg-gray-50 rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
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
        </div>
      </Card>

      <UploadBaseFileTab
        uploadedFiles={uploadedFiles}
        setUploadedFiles={setUploadedFiles}
      />

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1">
        <Tabs 
          value={activeSection} 
          onValueChange={setActiveSection}
          className="w-full"
        >
          <TabsList className="w-full justify-start bg-gray-50 p-1 rounded-lg">
            <TabsTrigger value="base" className="rounded-md">Base Data</TabsTrigger>
            <TabsTrigger value="qualification" className="rounded-md">Qualification KPI's</TabsTrigger>
            <TabsTrigger value="adjustment" className="rounded-md">Adjustment KPI's</TabsTrigger>
            <TabsTrigger value="exclusion" className="rounded-md">Exclusion KPI's</TabsTrigger>
            <TabsTrigger value="credit" className="rounded-md">Credit Hierarchy</TabsTrigger>
            <TabsTrigger value="variables" className="rounded-md">Global Variables</TabsTrigger>
          </TabsList>

          <div className="p-6">
            <TabsContent value="base">
              <BaseDataMappingTab
                baseDataMapping={baseDataMapping}
                setBaseDataMapping={setBaseDataMapping}
                availableFields={baseFile?.columns || []}
              />
            </TabsContent>

            <TabsContent value="qualification">
              <QualificationKpiTab
                qualificationRules={qualificationRules}
                setQualificationRules={setQualificationRules}
                kpiFields={kpiFields}
                disabled={false}
              />
            </TabsContent>

            <TabsContent value="adjustment">
              <AdjustmentKpiTab
                adjustmentRules={adjustmentRules}
                setAdjustmentRules={setAdjustmentRules}
                baseFields={baseFile?.columns || []}
                globalVariables={globalVariables}
                disabled={false}
              />
            </TabsContent>

            <TabsContent value="exclusion">
              <ExclusionKpiTab
                exclusionRules={exclusionRules}
                setExclusionRules={setExclusionRules}
                baseFields={baseFile?.columns || []}
                globalVariables={globalVariables}
                disabled={false}
              />
            </TabsContent>

            <TabsContent value="credit">
              <CreditHierarchyTab
                creditHierarchyMapping={creditHierarchy}
                setCreditHierarchyMapping={setCreditHierarchy}
                baseFields={hierarchyFile?.columns || []}
                disabled={false}
              />
            </TabsContent>

            <TabsContent value="variables">
              <GlobalVariablesTab
                variables={globalVariables}
                setVariables={setGlobalVariables}
                disabled={false}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}