import React, { useState } from 'react';
import { Save } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { format } from 'date-fns';
import { useAuthStore } from '../store/authStore';
import { BaseDataTab } from '../components/kpi/BaseDataTab';
import { GlobalVariablesTab } from '../components/kpi/GlobalVariablesTab';

function getNextVersionNumber(currentVersion: string): string {
  const [major, minor] = currentVersion.split('.').map(Number);
  return `${major}.${minor + 1}`;
}

interface CaseFileVersion {
  version: string;
  savedOn: string;
  description: string;
  status: 'Current' | 'Deprecated';
  data: {
    baseDataMapping: any;
    globalVariables: any[];
    qualificationRules: any[];
    adjustmentRules: any[];
  };
}

interface CaseFileObject {
  caseFileId: string;
  createdOn: string;
  createdBy: string;
  versions: CaseFileVersion[];
}

export default function KpiConfiguratorV2() {
  const user = useAuthStore((state) => state.user);
  const [activeSection, setActiveSection] = useState('base');
  
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
  const [caseFileObject, setCaseFileObject] = useState<CaseFileObject | null>(null);

  const handleSave = () => {
    try {
      const currentData = {
        baseDataMapping,
        globalVariables: globalVariables.map(v => ({
          name: v.name,
          description: v.description,
          dataType: v.dataType
        })),
        qualificationRules,
        adjustmentRules
      };

      let updatedCaseFile: CaseFileObject;

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
        const newVersion = getNextVersionNumber(latestVersion);

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
      link.download = `K_${updatedCaseFile.caseFileId}_${format(new Date(), 'ddMMYYYY_HHmmss')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error saving configuration:', error);
    }
  };

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
            <TabsTrigger value="variables" className="rounded-md">Global Variables</TabsTrigger>
          </TabsList>

          <div className="p-6">
            <TabsContent value="base">
              <BaseDataTab
                baseDataMapping={baseDataMapping}
                setBaseDataMapping={setBaseDataMapping}
              />
            </TabsContent>

            <TabsContent value="qualification">
              <Card className="bg-gray-50 rounded-xl p-6 shadow-sm border border-gray-200">
                <h3 className="text-xl font-semibold text-slate-800 mb-6">Qualification KPI's</h3>
                <div className="text-center text-gray-500 py-8">
                  Qualification KPI configuration coming soon
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="adjustment">
              <Card className="bg-gray-50 rounded-xl p-6 shadow-sm border border-gray-200">
                <h3 className="text-xl font-semibold text-slate-800 mb-6">Adjustment KPI's</h3>
                <div className="text-center text-gray-500 py-8">
                  Adjustment KPI configuration coming soon
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="variables">
              <GlobalVariablesTab
                variables={globalVariables}
                setVariables={setGlobalVariables}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}

export { KpiConfiguratorV2 }