import React from 'react';
import { Plus, X, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';

interface ExclusionRule {
  id: string;
  kpiName: string;
  description: string;
  sourceField: string;
  statusUpdate: string;
}

interface ExclusionKpiTabProps {
  exclusionRules: ExclusionRule[];
  setExclusionRules: (rules: ExclusionRule[]) => void;
  baseFields: string[];
  globalVariables: Array<{ id: string; name: string }>;
  disabled?: boolean;
}

export function ExclusionKpiTab({
  exclusionRules,
  setExclusionRules,
  baseFields,
  globalVariables,
  disabled = false
}: ExclusionKpiTabProps) {
  const addRule = () => {
    const newRule: ExclusionRule = {
      id: crypto.randomUUID(),
      kpiName: '',
      description: '',
      sourceField: '',
      statusUpdate: ''
    };
    setExclusionRules([...exclusionRules, newRule]);
  };

  const updateRule = (id: string, updates: Partial<ExclusionRule>) => {
    setExclusionRules(
      exclusionRules.map(rule => 
        rule.id === id ? { ...rule, ...updates } : rule
      )
    );
  };

  const removeRule = (id: string) => {
    setExclusionRules(exclusionRules.filter(rule => rule.id !== id));
  };

  const getRowStatus = (rule: ExclusionRule): 'ready' | 'incomplete' => {
    const mandatoryFields = ['kpiName', 'sourceField', 'statusUpdate'];
    return mandatoryFields.every(field => rule[field as keyof ExclusionRule]) ? 'ready' : 'incomplete';
  };

  if (baseFields.length === 0) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg text-gray-500 text-center flex items-center justify-center space-x-2">
        <AlertCircle className="h-5 w-5" />
        <span>Please upload base data file first to define exclusion rules</span>
      </div>
    );
  }

  return (
    <Card className="bg-gray-50 rounded-xl p-6 shadow-sm border border-gray-200">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-slate-800">Exclusion KPI's</h3>
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
        {exclusionRules.map((rule) => {
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
                    {baseFields.map(field => (
                      <option key={field} value={field}>{field}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status Update</label>
                  <select
                    value={rule.statusUpdate}
                    onChange={(e) => updateRule(rule.id, { statusUpdate: e.target.value })}
                    disabled={disabled}
                    className="w-full rounded-md border border-gray-300 shadow-inner px-3 py-2 focus:ring focus:outline-none disabled:bg-gray-50"
                  >
                    <option value="">Select variable</option>
                    {globalVariables.map(variable => (
                      <option key={variable.id} value={variable.name}>{variable.name}</option>
                    ))}
                  </select>
                </div>

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

        {exclusionRules.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            No exclusion rules defined yet
          </div>
        )}
      </div>
    </Card>
  );
}