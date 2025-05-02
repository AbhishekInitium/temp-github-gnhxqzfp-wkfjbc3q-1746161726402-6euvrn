import React from 'react';
import { Plus, X, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';

interface GlobalVariable {
  id: string;
  name: string;
  description: string;
  dataType: string;
}

interface GlobalVariablesTabProps {
  variables: GlobalVariable[];
  setVariables: (variables: GlobalVariable[]) => void;
  disabled?: boolean;
}

const DATA_TYPES = ["Currency", "Boolean", "Date", "Integer", "Percent", "String"];

export function GlobalVariablesTab({
  variables,
  setVariables,
  disabled = false
}: GlobalVariablesTabProps) {
  const addVariable = () => {
    const newVariable: GlobalVariable = {
      id: crypto.randomUUID(),
      name: "",
      description: "",
      dataType: "String"
    };
    setVariables([...variables, newVariable]);
  };

  const updateVariable = (id: string, updates: Partial<GlobalVariable>) => {
    setVariables(
      variables.map(variable => 
        variable.id === id ? { ...variable, ...updates } : variable
      )
    );
  };

  const removeVariable = (id: string) => {
    setVariables(variables.filter(variable => variable.id !== id));
  };

  const getRowStatus = (variable: GlobalVariable): 'ready' | 'incomplete' => {
    const mandatoryFields = ['name', 'dataType'];
    return mandatoryFields.every(field => variable[field as keyof GlobalVariable]) ? 'ready' : 'incomplete';
  };

  return (
    <Card className="bg-gray-50 rounded-xl p-6 shadow-sm border border-gray-200">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-slate-800">Global Variables</h3>
        {!disabled && (
          <Button
            onClick={addVariable}
            variant="outline"
            className="rounded-full hover:bg-gray-100 transition"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Variable
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {variables.map((variable) => {
          const rowStatus = getRowStatus(variable);

          return (
            <div key={variable.id} className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Variable Name</label>
                  <input
                    type="text"
                    value={variable.name}
                    onChange={(e) => updateVariable(variable.id, { name: e.target.value })}
                    disabled={disabled}
                    className="w-full rounded-md border border-gray-300 shadow-inner px-3 py-2 focus:ring focus:outline-none disabled:bg-gray-50"
                    placeholder="Enter variable name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <input
                    type="text"
                    value={variable.description}
                    onChange={(e) => updateVariable(variable.id, { description: e.target.value })}
                    disabled={disabled}
                    className="w-full rounded-md border border-gray-300 shadow-inner px-3 py-2 focus:ring focus:outline-none disabled:bg-gray-50"
                    placeholder="Enter description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data Type</label>
                  <select
                    value={variable.dataType}
                    onChange={(e) => updateVariable(variable.id, { dataType: e.target.value })}
                    disabled={disabled}
                    className="w-full rounded-md border border-gray-300 shadow-inner px-3 py-2 focus:ring focus:outline-none disabled:bg-gray-50"
                  >
                    {DATA_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
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
                      onClick={() => removeVariable(variable.id)}
                      variant="outline"
                      size="sm"
                      className="ml-auto rounded-full text-red-600 hover:text-red-700"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Remove Variable
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {variables.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            No global variables defined yet
          </div>
        )}
      </div>
    </Card>
  );
}