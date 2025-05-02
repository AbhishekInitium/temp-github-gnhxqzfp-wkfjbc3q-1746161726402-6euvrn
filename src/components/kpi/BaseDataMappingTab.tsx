import React from 'react';
import { Card } from '../ui/card';

interface BaseDataMapping {
  agentField: string;
  txnIdField: string;
  txnDateField: string;
  amountField: string;
}

interface BaseDataMappingTabProps {
  baseDataMapping: BaseDataMapping;
  setBaseDataMapping: (mapping: BaseDataMapping) => void;
  availableFields: string[];
}

export function BaseDataMappingTab({
  baseDataMapping,
  setBaseDataMapping,
  availableFields
}: BaseDataMappingTabProps) {
  return (
    <Card className="bg-gray-50 rounded-xl p-6 shadow-sm border border-gray-200">
      <h3 className="text-xl font-semibold text-slate-800 mb-6">Base Data Mapping</h3>
      <div className="grid grid-cols-1 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Commission Agent</label>
          <select
            value={baseDataMapping.agentField}
            onChange={(e) => setBaseDataMapping({ ...baseDataMapping, agentField: e.target.value })}
            className="w-full rounded-md border border-gray-300 shadow-inner px-3 py-2 focus:ring focus:outline-none"
          >
            <option value="">Select field</option>
            {availableFields.map(field => (
              <option key={field} value={field}>{field}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Commission TxnID</label>
          <select
            value={baseDataMapping.txnIdField}
            onChange={(e) => setBaseDataMapping({ ...baseDataMapping, txnIdField: e.target.value })}
            className="w-full rounded-md border border-gray-300 shadow-inner px-3 py-2 focus:ring focus:outline-none"
          >
            <option value="">Select field</option>
            {availableFields.map(field => (
              <option key={field} value={field}>{field}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Commission TxnDate</label>
          <select
            value={baseDataMapping.txnDateField}
            onChange={(e) => setBaseDataMapping({ ...baseDataMapping, txnDateField: e.target.value })}
            className="w-full rounded-md border border-gray-300 shadow-inner px-3 py-2 focus:ring focus:outline-none"
          >
            <option value="">Select field</option>
            {availableFields.map(field => (
              <option key={field} value={field}>{field}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Commission Amount</label>
          <select
            value={baseDataMapping.amountField}
            onChange={(e) => setBaseDataMapping({ ...baseDataMapping, amountField: e.target.value })}
            className="w-full rounded-md border border-gray-300 shadow-inner px-3 py-2 focus:ring focus:outline-none"
          >
            <option value="">Select field</option>
            {availableFields.map(field => (
              <option key={field} value={field}>{field}</option>
            ))}
          </select>
        </div>
      </div>
    </Card>
  );
}