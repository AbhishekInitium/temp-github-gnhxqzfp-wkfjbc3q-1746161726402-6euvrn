import React, { useState, useRef } from 'react';
import { format } from 'date-fns';
import { ArrowLeft, Upload, Edit2, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/tabs";
import { BaseDataMappingTab } from '../../components/kpi/BaseDataMappingTab';
import { GlobalVariablesTab } from '../../components/kpi/GlobalVariablesTab';
import { QualificationKpiTab } from '../../components/kpi/QualificationKpiTab';
import { AdjustmentKpiTab } from '../../components/kpi/AdjustmentKpiTab';
import { ExclusionKpiTab } from '../../components/kpi/ExclusionKpiTab';
import { CreditHierarchyTab } from '../../components/kpi/CreditHierarchyTab';

export function KpiConfiguratorList() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editMode, setEditMode] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');

  const [baseDataMapping, setBaseDataMapping] = useState<any>({});
  const [globalVariables, setGlobalVariables] = useState<any[]>([]);
  const [qualificationRules, setQualificationRules] = useState<any[]>([]);
  const [adjustmentRules, setAdjustmentRules] = useState<any[]>([]);
  const [exclusionRules, setExclusionRules] = useState<any[]>([]);
  const [creditHierarchy, setCreditHierarchy] = useState<any>(null);
  const [baseFields, setBaseFields] = useState<string[]>([]);
  const [hierarchyFields, setHierarchyFields] = useState<string[]>([]);
  const [caseFile, setCaseFile] = useState<any>(null);
  const [error, setError] = useState<string>('');

  const extractBaseFields = (data: any) => {
    // First try to get fields from uploadedFiles
    if (data?.uploadedFiles?.base?.columns) {
      return data.uploadedFiles.base.columns;
    }

    // Fallback to extracting from rules
    const fields = new Set<string>();
    if (data?.baseDataMapping) Object.values(data.baseDataMapping).forEach(f => fields.add(f));
    data?.qualificationRules?.forEach((r: any) => fields.add(r.sourceField));
    data?.adjustmentRules?.forEach((r: any) => fields.add(r.conditionField || ''));
    data?.adjustmentRules?.forEach((r: any) => fields.add(r.adjustFrom || ''));
    data?.exclusionRules?.forEach((r: any) => fields.add(r.sourceField));
    return Array.from(fields);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        const current = parsed.versions.find((v: any) => v.status === 'Current');
        const data = current?.data || {};

        setBaseDataMapping(data.baseDataMapping || {});
        setGlobalVariables(data.globalVariables || []);
        setQualificationRules(data.qualificationRules || []);
        setAdjustmentRules(data.adjustmentRules || []);
        setExclusionRules(data.exclusionRules || []);
        setCreditHierarchy(data.creditHierarchy || null);

        // Set fields from uploadedFiles or extract from rules
        setBaseFields(data.uploadedFiles?.base?.columns || extractBaseFields(data));
        setHierarchyFields(data.uploadedFiles?.hierarchy?.columns || []);

        setCaseFile(parsed);
        setEditMode(false);
        setHasChanges(false);
      } catch (err) {
        alert('Invalid JSON file uploaded.');
      }
    };
    reader.readAsText(file);
  };

  const handleSave = () => {
    if (!caseFile) return;

    try {
      const latest = caseFile.versions.find((v: any) => v.status === 'Current');
      const [major, minor] = latest.version.split('.').map(Number);
      const newVersion = `${major}.${minor + 1}`;

      const newData = {
        baseDataMapping,
        globalVariables,
        qualificationRules,
        adjustmentRules,
        exclusionRules,
        creditHierarchy,
        uploadedFiles: {
          base: { columns: baseFields },
          hierarchy: { columns: hierarchyFields }
        }
      };

      const newCase = {
        ...caseFile,
        versions: [
          {
            version: newVersion,
            savedOn: new Date().toISOString(),
            description: 'Edited via KPI Configurator',
            status: 'Current',
            data: newData
          },
          ...caseFile.versions.map((v: any) => ({
            ...v,
            status: 'Deprecated'
          }))
        ]
      };

      const blob = new Blob([JSON.stringify(newCase, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = uploadedFileName;
      link.click();

      setCaseFile(newCase);
      setEditMode(false);
      setHasChanges(false);

      // Navigate back to KPI Config Home
      navigate('/admin/kpi-config-home');
    } catch (error) {
      console.error('Save failed:', error);
      setError('Failed to save configuration');
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-12 px-4 space-y-8">
      <div className="flex justify-between items-center">
        <Button onClick={() => navigate('/admin/kpi-config-home')} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="space-x-2">
          {caseFile && !editMode && (
            <Button onClick={() => setEditMode(true)} variant="outline">
              <Edit2 className="h-4 w-4 mr-2" />
              Edit Configuration
            </Button>
          )}
          {editMode && hasChanges && (
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          )}
        </div>
      </div>

      {caseFile && (
        <Card className="bg-white p-6 rounded-lg border">
          <dl className="grid grid-cols-2 gap-6">
            <div>
              <dt className="text-sm font-medium text-gray-500">Case File ID</dt>
              <dd className="mt-1 text-lg text-gray-900">{caseFile.caseFileId}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Created By</dt>
              <dd className="mt-1 text-lg text-gray-900">{caseFile.createdBy}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Created On</dt>
              <dd className="mt-1 text-lg text-gray-900">
                {format(new Date(caseFile.createdOn), 'PPpp')}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Current Version</dt>
              <dd className="mt-1 text-lg text-gray-900">{caseFile.versions[0].version}</dd>
            </div>
          </dl>
        </Card>
      )}

      {!caseFile && (
        <Card className="bg-gray-50 rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-slate-800">Upload Configuration</h2>
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="rounded-full hover:bg-gray-100 transition"
              >
                <Upload className="h-4 w-4 mr-2" />
                Choose File
              </Button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </Card>
      )}

      {caseFile && (
        <Tabs defaultValue="base" className="w-full">
          <TabsList>
            <TabsTrigger value="base">Base Mapping</TabsTrigger>
            <TabsTrigger value="qualification">Qualification</TabsTrigger>
            <TabsTrigger value="adjustment">Adjustment</TabsTrigger>
            <TabsTrigger value="exclusion">Exclusion</TabsTrigger>
            <TabsTrigger value="hierarchy">Hierarchy</TabsTrigger>
            <TabsTrigger value="variables">Global Variables</TabsTrigger>
          </TabsList>

          <div className="p-6">
            <TabsContent value="base">
              <BaseDataMappingTab
                baseDataMapping={baseDataMapping}
                setBaseDataMapping={(val) => {
                  setBaseDataMapping(val);
                  setHasChanges(true);
                }}
                availableFields={baseFields}
                disabled={!editMode}
              />
            </TabsContent>

            <TabsContent value="qualification">
              <QualificationKpiTab
                qualificationRules={qualificationRules}
                setQualificationRules={(val) => {
                  setQualificationRules(val);
                  setHasChanges(true);
                }}
                kpiFields={baseFields.map((f) => ({ name: f, dataType: 'String' }))}
                disabled={!editMode}
              />
            </TabsContent>

            <TabsContent value="adjustment">
              <AdjustmentKpiTab
                adjustmentRules={adjustmentRules}
                setAdjustmentRules={(val) => {
                  setAdjustmentRules(val);
                  setHasChanges(true);
                }}
                baseFields={baseFields}
                globalVariables={globalVariables}
                disabled={!editMode}
              />
            </TabsContent>

            <TabsContent value="exclusion">
              <ExclusionKpiTab
                exclusionRules={exclusionRules}
                setExclusionRules={(val) => {
                  setExclusionRules(val);
                  setHasChanges(true);
                }}
                baseFields={baseFields}
                globalVariables={globalVariables}
                disabled={!editMode}
              />
            </TabsContent>

            <TabsContent value="hierarchy">
              <CreditHierarchyTab
                creditHierarchyMapping={creditHierarchy}
                setCreditHierarchyMapping={(val) => {
                  setCreditHierarchy(val);
                  setHasChanges(true);
                }}
                baseFields={hierarchyFields}
                disabled={!editMode}
              />
            </TabsContent>

            <TabsContent value="variables">
              <GlobalVariablesTab
                variables={globalVariables}
                setVariables={(val) => {
                  setGlobalVariables(val);
                  setHasChanges(true);
                }}
                disabled={!editMode}
              />
            </TabsContent>
          </div>
        </Tabs>
      )}
    </div>
  );
}