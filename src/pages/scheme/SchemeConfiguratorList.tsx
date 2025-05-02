import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Edit2, Upload, AlertCircle, Check } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { format } from 'date-fns';

interface SchemeVersion {
  version: string;
  savedOn: string;
  description: string;
  status: 'Current' | 'Deprecated';
  data: {
    schemeName: string;
    executionLogic: {
      rules: any[];
      conditions: any[];
      actions: any[];
    };
    rewardMatrix: {
      tiers: any[];
      bonuses: any[];
      multipliers: any[];
    };
    schemeMetadata: {
      effectiveFrom: string;
      effectiveTo: string;
      territory: string;
      businessUnit: string;
      targetAudience: string[];
    };
  };
}

interface SchemeFileObject {
  schemeId: string;
  createdOn: string;
  createdBy: string;
  versions: SchemeVersion[];
}

export function SchemeConfiguratorList() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editMode, setEditMode] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeSection, setActiveSection] = useState('metadata');
  const [selectedFile, setSelectedFile] = useState<SchemeFileObject | null>(null);
  const [error, setError] = useState<string>('');

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const schemeFile = JSON.parse(e.target?.result as string);
        
        if (!schemeFile.schemeId || !schemeFile.versions || !Array.isArray(schemeFile.versions)) {
          throw new Error('Invalid scheme configuration format');
        }

        const currentVersion = schemeFile.versions.find(v => v.status === 'Current');
        if (!currentVersion) {
          throw new Error('No current version found in scheme configuration');
        }

        setSelectedFile(schemeFile);
        setEditMode(false);
        setHasChanges(false);
        setError('');
      } catch (err) {
        console.error('Error parsing scheme configuration:', err);
        setError(err instanceof Error ? err.message : 'Failed to parse scheme configuration');
        setSelectedFile(null);
      }
    };

    reader.onerror = () => {
      setError('Failed to read file');
      setSelectedFile(null);
    };

    reader.readAsText(file);
  };

  const handleSave = () => {
    if (!selectedFile) return;

    try {
      const latestVersion = selectedFile.versions[0].version;
      const [major, minor] = latestVersion.split('.').map(Number);
      const newVersion = `${major}.${minor + 1}`;

      const updatedFile: SchemeFileObject = {
        ...selectedFile,
        versions: [
          {
            ...selectedFile.versions[0],
            version: newVersion,
            savedOn: new Date().toISOString(),
            description: 'Updated via scheme configuration editor',
            status: 'Current'
          },
          ...selectedFile.versions.map(v => ({ ...v, status: 'Deprecated' as const }))
        ]
      };

      const jsonStr = JSON.stringify(updatedFile, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${selectedFile.schemeId}_scheme.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setSelectedFile(updatedFile);
      setEditMode(false);
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving scheme configuration:', error);
      setError('Failed to save scheme configuration');
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-12 px-4 space-y-8">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Button
            onClick={() => navigate('/admin')}
            variant="outline"
            className="rounded-full"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-semibold text-slate-800">View Scheme Configuration</h1>
        </div>
        <div className="flex space-x-3">
          {selectedFile && !editMode && (
            <Button
              onClick={() => setEditMode(true)}
              variant="outline"
              className="rounded-full hover:bg-gray-100 transition"
            >
              <Edit2 className="h-4 w-4 mr-2" />
              Edit Configuration
            </Button>
          )}
          {selectedFile && editMode && hasChanges && (
            <Button
              onClick={handleSave}
              className="rounded-full bg-black text-white hover:opacity-90 transition"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          )}
        </div>
      </div>

      <Card className="bg-gray-50 rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-slate-800">Upload Scheme Configuration</h2>
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

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {selectedFile && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <dl className="grid grid-cols-2 gap-6">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Scheme ID</dt>
                  <dd className="mt-1 text-lg text-gray-900">{selectedFile.schemeId}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Created By</dt>
                  <dd className="mt-1 text-lg text-gray-900">{selectedFile.createdBy}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Created On</dt>
                  <dd className="mt-1 text-lg text-gray-900">
                    {format(new Date(selectedFile.createdOn), 'PPpp')}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Latest Version</dt>
                  <dd className="mt-1 text-lg text-gray-900">{selectedFile.versions[0].version}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Scheme Name</dt>
                  <dd className="mt-1 text-lg text-gray-900">{selectedFile.versions[0].data.schemeName}</dd>
                </div>
              </dl>
            </div>
          )}
        </div>
      </Card>

      {selectedFile && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1">
          <Tabs 
            value={activeSection} 
            onValueChange={setActiveSection}
            className="w-full"
          >
            <TabsList className="w-full justify-start bg-gray-50 p-1 rounded-lg">
              <TabsTrigger value="metadata" className="rounded-md">Metadata</TabsTrigger>
              <TabsTrigger value="execution" className="rounded-md">Execution Logic</TabsTrigger>
              <TabsTrigger value="rewards" className="rounded-md">Reward Matrix</TabsTrigger>
            </TabsList>

            <div className="p-6">
              <TabsContent value="metadata">
                <Card className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">Scheme Metadata</h3>
                  <dl className="grid grid-cols-2 gap-4">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Effective From</dt>
                      <dd className="mt-1 text-gray-900">
                        {format(new Date(selectedFile.versions[0].data.schemeMetadata.effectiveFrom), 'PP')}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Effective To</dt>
                      <dd className="mt-1 text-gray-900">
                        {format(new Date(selectedFile.versions[0].data.schemeMetadata.effectiveTo), 'PP')}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Territory</dt>
                      <dd className="mt-1 text-gray-900">{selectedFile.versions[0].data.schemeMetadata.territory}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Business Unit</dt>
                      <dd className="mt-1 text-gray-900">{selectedFile.versions[0].data.schemeMetadata.businessUnit}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-sm font-medium text-gray-500">Target Audience</dt>
                      <dd className="mt-1 text-gray-900">
                        {selectedFile.versions[0].data.schemeMetadata.targetAudience.join(', ')}
                      </dd>
                    </div>
                  </dl>
                </Card>
              </TabsContent>

              <TabsContent value="execution">
                <Card className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">Execution Logic</h3>
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-md font-medium mb-2">Rules</h4>
                      <pre className="bg-gray-100 p-4 rounded-lg overflow-auto">
                        {JSON.stringify(selectedFile.versions[0].data.executionLogic.rules, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <h4 className="text-md font-medium mb-2">Conditions</h4>
                      <pre className="bg-gray-100 p-4 rounded-lg overflow-auto">
                        {JSON.stringify(selectedFile.versions[0].data.executionLogic.conditions, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <h4 className="text-md font-medium mb-2">Actions</h4>
                      <pre className="bg-gray-100 p-4 rounded-lg overflow-auto">
                        {JSON.stringify(selectedFile.versions[0].data.executionLogic.actions, null, 2)}
                      </pre>
                    </div>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="rewards">
                <Card className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">Reward Matrix</h3>
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-md font-medium mb-2">Tiers</h4>
                      <pre className="bg-gray-100 p-4 rounded-lg overflow-auto">
                        {JSON.stringify(selectedFile.versions[0].data.rewardMatrix.tiers, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <h4 className="text-md font-medium mb-2">Bonuses</h4>
                      <pre className="bg-gray-100 p-4 rounded-lg overflow-auto">
                        {JSON.stringify(selectedFile.versions[0].data.rewardMatrix.bonuses, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <h4 className="text-md font-medium mb-2">Multipliers</h4>
                      <pre className="bg-gray-100 p-4 rounded-lg overflow-auto">
                        {JSON.stringify(selectedFile.versions[0].data.rewardMatrix.multipliers, null, 2)}
                      </pre>
                    </div>
                  </div>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      )}
    </div>
  );
}