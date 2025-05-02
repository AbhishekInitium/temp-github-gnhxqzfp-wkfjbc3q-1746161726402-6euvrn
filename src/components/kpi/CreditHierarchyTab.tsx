import React from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { Card } from '../ui/card';

interface CreditHierarchyMapping {
  id: string;
  managerField: string;
  validFromField: string;
  validToField: string;
}

interface CreditHierarchyTabProps {
  creditHierarchyMapping: CreditHierarchyMapping | null;
  setCreditHierarchyMapping: (mapping: CreditHierarchyMapping | null) => void;
  baseFields: string[];
}

export function CreditHierarchyTab({
  creditHierarchyMapping,
  setCreditHierarchyMapping,
  baseFields
}: CreditHierarchyTabProps) {
  React.useEffect(() => {
    // Initialize mapping if not exists
    if (!creditHierarchyMapping && baseFields.length > 0) {
      setCreditHierarchyMapping({
        id: crypto.randomUUID(),
        managerField: '',
        validFromField: '',
        validToField: ''
      });
    }
  }, [creditHierarchyMapping, baseFields, setCreditHierarchyMapping]);

  const updateMapping = (updates: Partial<CreditHierarchyMapping>) => {
    if (creditHierarchyMapping) {
      setCreditHierarchyMapping({
        ...creditHierarchyMapping,
        ...updates
      });
    }
  };

  const getRowStatus = (mapping: CreditHierarchyMapping): 'ready' | 'incomplete' => {
    const mandatoryFields = ['managerField', 'validFromField', 'validToField'];
    return mandatoryFields.every(field => mapping[field as keyof CreditHierarchyMapping]) ? 'ready' : 'incomplete';
  };

  if (baseFields.length === 0) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg text-gray-500 text-center flex items-center justify-center space-x-2">
        <AlertCircle className="h-5 w-5" />
        <span>Please upload hierarchy file first to configure credit hierarchy mapping</span>
      </div>
    );
  }

  return (
    <Card className="bg-gray-50 rounded-xl p-6 shadow-sm border border-gray-200">
      <h3 className="text-xl font-semibold text-slate-800 mb-6">Credit Hierarchy Mapping</h3>
      
      <div className="space-y-6">
        {creditHierarchyMapping && (
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Manager Field</label>
                <select
                  value={creditHierarchyMapping.managerField}
                  onChange={(e) => updateMapping({ managerField: e.target.value })}
                  className="w-full rounded-md border border-gray-300 shadow-inner px-3 py-2 focus:ring focus:outline-none"
                >
                  <option value="">Select field</option>
                  {baseFields.map(field => (
                    <option key={field} value={field}>{field}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valid From Field</label>
                <select
                  value={creditHierarchyMapping.validFromField}
                  onChange={(e) => updateMapping({ validFromField: e.target.value })}
                  className="w-full rounded-md border border-gray-300 shadow-inner px-3 py-2 focus:ring focus:outline-none"
                >
                  <option value="">Select field</option>
                  {baseFields.map(field => (
                    <option key={field} value={field}>{field}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valid To Field</label>
                <select
                  value={creditHierarchyMapping.validToField}
                  onChange={(e) => updateMapping({ validToField: e.target.value })}
                  className="w-full rounded-md border border-gray-300 shadow-inner px-3 py-2 focus:ring focus:outline-none"
                >
                  <option value="">Select field</option>
                  {baseFields.map(field => (
                    <option key={field} value={field}>{field}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                {getRowStatus(creditHierarchyMapping) === 'ready' ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-sm text-gray-500">All required fields complete</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                    <span className="text-sm text-gray-500">Required fields missing</span>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {!creditHierarchyMapping && (
          <div className="text-center text-gray-500 py-8">
            No credit hierarchy mapping defined yet
          </div>
        )}
      </div>
    </Card>
  );
}