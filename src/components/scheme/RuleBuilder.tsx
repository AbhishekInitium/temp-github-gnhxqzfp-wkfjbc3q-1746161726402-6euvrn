import React from 'react';
import { Plus, X, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import type { KpiField } from '../../types';

interface Rule {
  id: string;
  kpiName: string;
  sourceField: string;
  valueType: 'Fixed' | 'Lookup';
  operator?: string;
  value?: string;
  status?: string;
}

interface RuleBuilderProps {
  rules: Rule[];
  onChange: (rules: Rule[]) => void;
  disabled?: boolean;
  kpiFields?: KpiField[];
  sectionName?: string;
}

const OPERATORS = {
  Number: ['=', '!=', '>', '<', '>=', '<='],
  String: ['=', '!=', 'CONTAINS', 'NOT CONTAINS', 'IN', 'NOT IN'],
  Date: ['=', '!=', '>', '<', '>=', '<=']
};

export function RuleBuilder({ rules, onChange, disabled = false, kpiFields = [], sectionName = '' }: RuleBuilderProps) {
  const addRule = () => {
    const newRule: Rule = {
      id: crypto.randomUUID(),
      kpiName: '',
      sourceField: '',
      valueType: 'Fixed',
      operator: '=',
      value: '',
      status: ''
    };
    onChange([...rules, newRule]);
  };

  const updateRule = (id: string, updates: Partial<Rule>) => {
    onChange(rules.map(rule => 
      rule.id === id ? { ...rule, ...updates } : rule
    ));
  };

  const removeRule = (id: string) => {
    onChange(rules.filter(rule => rule.id !== id));
  };

  const getFieldDataType = (fieldName: string): string => {
    const field = kpiFields.find(f => f.name === fieldName);
    return field?.dataType || 'String';
  };

  const getRowStatus = (rule: Rule): 'ready' | 'incomplete' => {
    const mandatoryFields = ['kpiName', 'sourceField', 'valueType', 'status'];
    return mandatoryFields.every(field => rule[field as keyof Rule]) ? 'ready' : 'incomplete';
  };

  if (kpiFields.length === 0) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg text-gray-500 text-center flex items-center justify-center space-x-2">
        <AlertCircle className="h-5 w-5" />
        <span>Please upload a KPI configuration first to define rules</span>
      </div>
    );
  }

  return (
    <Card className="bg-gray-50 rounded-xl p-6 shadow-sm border border-gray-200">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-slate-800">{sectionName || 'Rules'}</h3>
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
        {rules.map((rule) => {
          const dataType = getFieldDataType(rule.sourceField);
          const availableOperators = OPERATORS[dataType as keyof typeof OPERATORS] || OPERATORS.String;
          const rowStatus = getRowStatus(rule);

          return (
            <div key={rule.id} className="flex items-center space-x-4 p-4 bg-white rounded-lg border">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">KPI Name</label>
                <input
                  type="text"
                  value={rule.kpiName}
                  onChange={(e) => updateRule(rule.id, { kpiName: e.target.value })}
                  disabled={disabled}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="Enter KPI name"
                />
              </div>

              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Source Field</label>
                <select
                  value={rule.sourceField}
                  onChange={(e) => updateRule(rule.id, { sourceField: e.target.value })}
                  disabled={disabled}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="">Select field</option>
                  {kpiFields.map(field => (
                    <option key={field.name} value={field.name}>{field.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Value Type</label>
                <select
                  value={rule.valueType}
                  onChange={(e) => updateRule(rule.id, { valueType: e.target.value as 'Fixed' | 'Lookup' })}
                  disabled={disabled}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="">Select type</option>
                  <option value="Fixed">Fixed</option>
                  <option value="Lookup">Lookup</option>
                </select>
              </div>

              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <input
                  type="text"
                  value={rule.status}
                  onChange={(e) => updateRule(rule.id, { status: e.target.value })}
                  disabled={disabled}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="Enter status"
                />
              </div>

              <div className="flex items-end space-x-2 pb-1">
                {rowStatus === 'ready' ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                )}

                {!disabled && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeRule(rule.id)}
                    className="rounded-full hover:bg-gray-100 transition"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}

        {rules.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            No rules defined yet
          </div>
        )}
      </div>
    </Card>
  );
}