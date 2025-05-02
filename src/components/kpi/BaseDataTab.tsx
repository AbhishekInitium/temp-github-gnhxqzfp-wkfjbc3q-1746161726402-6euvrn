import React from 'react';
import { Card } from '../ui/card';

interface BaseDataTabProps {
  baseDataMapping: {
    agentField: string;
    txnIdField: string;
    txnDateField: string;
    amountField: string;
  };
  setBaseDataMapping: (mapping: any) => void;
  disabled?: boolean;
}

export function BaseDataTab({
  baseDataMapping,
  setBaseDataMapping,
  disabled = false
}: BaseDataTabProps) {
  return (
    <Card className="bg-gray-50 rounded-xl p-6 shadow-sm border border-gray-200">
      <h3 className="text-xl font-semibold text-slate-800 mb-6">Base Data Configuration</h3>
      <div className="grid grid-cols-1 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Agent Field</label>
          <input
            type="text"
            value={baseDataMapping.agentField}
            onChange={(e) => setBaseDataMapping(prev => ({ ...prev, agentField: e.target.value }))}
            disabled={disabled}
            className="w-full rounded-md border border-gray-300 shadow-inner px-3 py-2 focus:ring focus:outline-none"
            placeholder="Enter agent field"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Transaction ID Field</label>
          <input
            type="text"
            value={baseDataMapping.txnIdField}
            onChange={(e) => setBaseDataMapping(prev => ({ ...prev, txnIdField: e.target.value }))}
            disabled={disabled}
            className="w-full rounded-md border border-gray-300 shadow-inner px-3 py-2 focus:ring focus:outline-none"
            placeholder="Enter transaction ID field"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Date Field</label>
          <input
            type="text"
            value={baseDataMapping.txnDateField}
            onChange={(e) => setBaseDataMapping(prev => ({ ...prev, txnDateField: e.target.value }))}
            disabled={disabled}
            className="w-full rounded-md border border-gray-300 shadow-inner px-3 py-2 focus:ring focus:outline-none"
            placeholder="Enter transaction date field"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Amount Field</label>
          <input
            type="text"
            value={baseDataMapping.amountField}
            onChange={(e) => setBaseDataMapping(prev => ({ ...prev, amountField: e.target.value }))}
            disabled={disabled}
            className="w-full rounded-md border border-gray-300 shadow-inner px-3 py-2 focus:ring focus:outline-none"
            placeholder="Enter amount field"
          />
        </div>
      </div>
    </Card>
  );
}