import React from 'react';
import { Plus, X, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import type { AdjustmentRule, KpiField } from '../../types';

interface AdjustmentRuleBuilderProps {
  rules: AdjustmentRule[];
  onChange: (rules: AdjustmentRule[]) => void;
  disabled?: boolean;
  kpiFields?: KpiField[];
  sectionName?: string;
}

const OPERATORS = {
  Number: ['=', '!=', '>', '<', '>=', '<='],
  String: ['=', '!=', 'CONTAINS', 'NOT CONTAINS', 'IN', 'NOT IN'],
  Date: ['=', '!=', '>', '<', '>=', '<=']
};

export function AdjustmentRuleBuilder({ 
  rules, 
  onChange, 
  disabled = false, 
  kpiFields = [],
  sectionName = ''
}: AdjustmentRuleBuilderProps) {
  const addRule = () => {
    const newRule: AdjustmentRule = {
      id: crypto.randomUUID(),
      kpiName: '',
      description: '',
      conditionField: '',
      operator: '=',
      adjustWhat: '',
      direction: 'Increase',
      type: 'Fixed',
      valueType: 'Fixed'
    };
    onChange([...rules, newRule]);
  };

  const updateRule = (id: string, updates: Partial<AdjustmentRule>) => {
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

  const getRowStatus = (rule: AdjustmentRule): 'ready' | 'incomplete' => {
    const mandatoryFields = ['kpiName', 'conditionField', 'adjustWhat'];
    return mandatoryFields.every(field => rule[field as keyof AdjustmentRule]) ? 'ready' : 'incomplete';
  };

  if (kpiFields.length === 0) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg text-gray-500 text-center flex items-center justify-center space-x-2">
        <AlertCircle className="h-5 w-5" />
        <span>Please upload a KPI configuration first to define adjustment rules</span>
      </div>
    );
  }

  return (
    <Card className="bg-gray-50 rounded-xl p-6 shadow-sm border border-gray-200">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-slate-800">{sectionName || 'Adjustment Rules'}</h3>
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
          const dataType = getFieldDataType(rule.conditionField);
          const availableOperators = OPERATORS[dataType as keyof typeof OPERATORS] || OPERATORS.String;
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Condition Field</label>
                  <select
                    value={rule.conditionField}
                    onChange={(e) => updateRule(rule.id, { conditionField: e.target.value })}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Operator</label>
                  <select
                    value={rule.operator}
                    onChange={(e) => updateRule(rule.id, { operator: e.target.value })}
                    disabled={disabled}
                    className="w-full rounded-md border border-gray-300 shadow-inner px-3 py-2 focus:ring focus:outline-none disabled:bg-gray-50"
                  >
                    {availableOperators.map(op => (
                      <option key={op} value={op}>{op}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Adjust What</label>
                  <select
                    value={rule.adjustWhat}
                    onChange={(e) => updateRule(rule.id, { adjustWhat: e.target.value })}
                    disabled={disabled}
                    className="w-full rounded-md border border-gray-300 shadow-inner px-3 py-2 focus:ring focus:outline-none disabled:bg-gray-50"
                  >
                    <option value="">Select variable</option>
                    <option value="RTAMT">RTAMT</option>
                    <option value="ATAMT">ATAMT</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Direction</label>
                  <select
                    value={rule.direction}
                    onChange={(e) => updateRule(rule.id, { direction: e.target.value as 'Increase' | 'Decrease' })}
                    disabled={disabled}
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
                    onChange={(e) => updateRule(rule.id, { type: e.target.value as 'Fixed' | 'Percentage' })}
                    disabled={disabled}
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
                    onChange={(e) => updateRule(rule.id, { valueType: e.target.value as 'Fixed' | 'Lookup' })}
                    disabled={disabled}
                    className="w-full rounded-md border border-gray-300 shadow-inner px-3 py-2 focus:ring focus:outline-none disabled:bg-gray-50"
                  >
                    <option value="Fixed">Fixed</option>
                    <option value="Lookup">Lookup</option>
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

        {rules.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            No adjustment rules defined yet
          </div>
        )}
      </div>
    </Card>
  );
}