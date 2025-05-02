import React from 'react';
import { Plus, X, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';

interface QualificationRule {
  id: string;
  kpiName: string;
  description: string;
  sourceField: string;
  valueType: 'Fixed' | 'Lookup';
  evaluationLevel: 'Per Record' | 'Per Agent';
  aggregation: 'Sum' | 'Average' | 'Min' | 'Max' | 'N/A';
}

interface QualificationKpiTabProps {
  qualificationRules: QualificationRule[];
  setQualificationRules: (rules: QualificationRule[]) => void;
  kpiFields: { name: string; dataType: string }[];
  disabled?: boolean;
}

export function QualificationKpiTab({
  qualificationRules,
  setQualificationRules,
  kpiFields,
  disabled = false
}: QualificationKpiTabProps) {
  const addRule = () => {
    const newRule: QualificationRule = {
      id: crypto.randomUUID(),
      kpiName: '',
      description: '',
      sourceField: '',
      valueType: 'Fixed',
      evaluationLevel: 'Per Record',
      aggregation: 'N/A'
    };
    setQualificationRules([...qualificationRules, newRule]);
  };

  const updateRule = (id: string, updates: Partial<QualificationRule>) => {
    setQualificationRules(
      qualificationRules.map(rule => 
        rule.id === id ? { ...rule, ...updates } : rule
      )
    );
  };

  const removeRule = (id: string) => {
    setQualificationRules(qualificationRules.filter(rule => rule.id !== id));
  };

  const getRowStatus = (rule: QualificationRule): 'ready' | 'incomplete' => {
    const mandatoryFields = ['kpiName', 'sourceField', 'valueType', 'evaluationLevel'];
    return mandatoryFields.every(field => rule[field as keyof QualificationRule]) ? 'ready' : 'incomplete';
  };

  if (kpiFields.length === 0) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg text-gray-500 text-center flex items-center justify-center space-x-2">
        <AlertCircle className="h-5 w-5" />
        <span>Please upload a KPI configuration first to define qualification rules</span>
      </div>
    );
  }

  return (
    <Card className="bg-gray-50 rounded-xl p-6 shadow-sm border border-gray-200">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-slate-800">Qualification KPI's</h3>
        {!disabled && (
          <Button
            onClick={addRule}
            variant="outline"
            className="rounded-full hover:bg-gray-100 transition"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add KPI
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {qualificationRules.map((rule) => {
          const rowStatus = getRowStatus(rule);

          return (
            <div key={rule.id} className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">KPI Name</label>
                  <input
                    type="text"
                    value={rule.kpiName}
                    onChange={(e) => updateRule(rule.id, { kpiName: e.target.value })}
                    disabled={disabled}
                    className="w-full rounded-md border border-gray-300 shadow-inner px-3 py-2 focus:ring focus:outline-none disabled:bg-gray-50"
                    placeholder="Enter KPI name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <input
                    type="text"
                    value={rule.description}
                    onChange={(e) => updateRule(rule.id, { description: e.target.value })}
                    disabled={disabled}
                    className="w-full rounded-md border border-gray-300 shadow-inner px-3 py-2 focus:ring focus:outline-none disabled:bg-gray-50"
                    placeholder="Enter description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Source Field</label>
                  <select
                    value={rule.sourceField}
                    onChange={(e) => updateRule(rule.id, { sourceField: e.target.value })}
                    disabled={disabled}
                    className="w-full rounded-md border border-gray-300 shadow-inner px-3 py-2 focus:ring focus:outline-none disabled:bg-gray-50"
                  >
                    <option value="">Select field</option>
                    {kpiFields.map(field => (
                      <option key={field.name} value={field.name}>{field.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Value Type</label>
                  <select
                    value={rule.valueType}
                    onChange={(e) => updateRule(rule.id, { valueType: e.target.value as 'Fixed' | 'Lookup' })}
                    disabled={disabled}
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
                      updateRule(rule.id, {
                        evaluationLevel: newLevel,
                        aggregation: newLevel === 'Per Record' ? 'N/A' : rule.aggregation
                      });
                    }}
                    disabled={disabled}
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
                      onChange={(e) => updateRule(rule.id, {
                        aggregation: e.target.value as 'Sum' | 'Average' | 'Min' | 'Max' | 'N/A'
                      })}
                      disabled={disabled}
                      className="w-full rounded-md border border-gray-300 shadow-inner px-3 py-2 focus:ring focus:outline-none disabled:bg-gray-50"
                    >
                      <option value="Sum">Sum</option>
                      <option value="Average">Average</option>
                      <option value="Min">Min</option>
                      <option value="Max">Max</option>
                    </select>
                  </div>
                )}

                <div className="col-span-2 flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    {rowStatus === 'ready' ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-yellow-500" />
                    )}
                    <span className="text-sm text-gray-500">
                      {rowStatus === 'ready' ? 'All required fields complete' : 'Required fields missing'}
                    </span>
                  </div>

                  {!disabled && (
                    <Button
                      onClick={() => removeRule(rule.id)}
                      variant="outline"
                      size="sm"
                      className="rounded-full text-red-600 hover:text-red-700"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Remove KPI
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {qualificationRules.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            No qualification rules defined yet
          </div>
        )}
      </div>
    </Card>
  );
}