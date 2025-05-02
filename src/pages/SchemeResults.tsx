import React, { useState } from 'react';
import { ArrowLeft, Download, FileSpreadsheet, AlertCircle, CheckCircle2, Terminal, ChevronDown, ChevronRight } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { format } from 'date-fns';

interface ExecutionResult {
  success: boolean;
  message: string;
  data: {
    totalRecords: number;
    processedAt: string;
    summary: {
      totalAgents: number;
      qualified: number;
      totalPayout: number;
    };
    agents: Array<{
      agentId: string;
      qualified: boolean;
      commission: number;
    }>;
    executionSteps: string[];
    rawRecordLevelData: Array<{
      ruleType: string;
      recordId?: string;
      agentId: string;
      matched?: boolean;
      reason?: string;
      condition?: string;
      effect?: string;
      message?: string;
      timestamp: string;
      evaluation?: string;
      evaluatedValue?: string;
      baseAmount?: string;
      payoutAmount?: string;
      tiersUsed?: string;
      ruleId?: string;
    }>;
  };
}

export function SchemeResults() {
  const navigate = useNavigate();
  const location = useLocation();
  const result = location.state?.result as ExecutionResult;
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set());
  const [showExecutionSteps, setShowExecutionSteps] = useState(false);

  if (!result) {
    return (
      <div className="max-w-5xl mx-auto py-12 px-4">
        <Card className="bg-yellow-50 p-6 rounded-xl border border-yellow-200">
          <div className="flex items-center space-x-3 text-yellow-800">
            <AlertCircle className="h-6 w-6" />
            <h3 className="text-lg font-medium">No Results Available</h3>
          </div>
          <p className="mt-2 text-yellow-700">
            Please execute a scheme to view results.
          </p>
          <Button
            onClick={() => navigate('/execution')}
            variant="outline"
            className="mt-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Return to Execution
          </Button>
        </Card>
      </div>
    );
  }

  const { data } = result;

  const downloadResults = () => {
    const jsonStr = JSON.stringify(result, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `scheme_results_${format(new Date(), 'yyyyMMdd_HHmmss')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const toggleAgent = (agentId: string) => {
    setExpandedAgents(prev => {
      const next = new Set(prev);
      if (next.has(agentId)) {
        next.delete(agentId);
      } else {
        next.add(agentId);
      }
      return next;
    });
  };

  const getAgentLogs = (agentId: string) => {
    if (!data.rawRecordLevelData) return [];
    
    return data.rawRecordLevelData
      .filter(log => log.agentId === agentId)
      .map(log => ({
        recordId: log.recordId || log.ruleId || 'N/A',
        ruleType: log.ruleType,
        details: getLogDetails(log),
        timestamp: log.timestamp,
        matched: log.matched,
        condition: log.condition,
        evaluation: log.evaluation,
        evaluatedValue: log.evaluatedValue,
        message: log.message,
        reason: log.reason
      }));
  };

  const getRuleTypeBadgeClass = (type: string): string => {
    switch (type.toLowerCase()) {
      case 'qualification':
        return 'bg-blue-100 text-blue-800';
      case 'adjustment':
        return 'bg-green-100 text-green-800';
      case 'exclusion':
        return 'bg-red-100 text-red-800';
      case 'dataerror':
        return 'bg-yellow-100 text-yellow-800';
      case 'custom':
        return 'bg-purple-100 text-purple-800';
      case 'quota':
        return 'bg-orange-100 text-orange-800';
      case 'payoutcalculation':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getLogDetails = (log: any): string => {
    const details = [];

    if (log.reason) {
      details.push(log.reason);
    }
    if (log.condition && log.evaluation) {
      details.push(`${log.condition} - ${log.evaluation}`);
    }
    if (log.evaluatedValue) {
      details.push(`Value: ${log.evaluatedValue}`);
    }
    if (log.message) {
      details.push(log.message);
    }
    if (log.effect) {
      details.push(log.effect);
    }
    if (log.baseAmount && log.payoutAmount) {
      details.push(`Base Amount: ${log.baseAmount}, Payout: ${log.payoutAmount}`);
      if (log.tiersUsed) {
        details.push(`Tiers: ${log.tiersUsed}`);
      }
    }

    return details.filter(Boolean).join(' | ') || 'No details available';
  };

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 space-y-8">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Button
            onClick={() => navigate('/execution')}
            variant="outline"
            className="rounded-full"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Execution
          </Button>
          <h1 className="text-3xl font-semibold text-slate-800">Execution Results</h1>
        </div>
        <Button
          onClick={downloadResults}
          className="rounded-full bg-black text-white hover:opacity-90"
        >
          <Download className="h-4 w-4 mr-2" />
          Download Results
        </Button>
      </div>

      <Card className="bg-gray-50 rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex items-center space-x-3 mb-6">
          {result.success ? (
            <CheckCircle2 className="h-6 w-6 text-green-600" />
          ) : (
            <AlertCircle className="h-6 w-6 text-red-600" />
          )}
          <h2 className="text-xl font-semibold text-slate-800">Summary</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="text-sm font-medium text-gray-500">Total Records</div>
            <div className="mt-2 text-3xl font-semibold text-gray-900">
              {data.totalRecords.toLocaleString()}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="text-sm font-medium text-gray-500">Total Agents</div>
            <div className="mt-2 text-3xl font-semibold text-gray-900">
              {data.summary.totalAgents.toLocaleString()}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="text-sm font-medium text-gray-500">Qualified Agents</div>
            <div className="mt-2 text-3xl font-semibold text-gray-900">
              {data.summary.qualified.toLocaleString()}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="text-sm font-medium text-gray-500">Total Payout</div>
            <div className="mt-2 text-3xl font-semibold text-gray-900">
              ₹{data.summary.totalPayout.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </Card>

      {data.executionSteps && data.executionSteps.length > 0 && (
        <Card className="bg-gray-50 rounded-xl p-6 shadow-sm border border-gray-200">
          <div 
            className="flex items-center space-x-3 mb-6 cursor-pointer"
            onClick={() => setShowExecutionSteps(!showExecutionSteps)}
          >
            <Terminal className="h-6 w-6 text-indigo-600" />
            <h2 className="text-xl font-semibold text-slate-800">Execution Steps</h2>
            {showExecutionSteps ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </div>
          
          {showExecutionSteps && (
            <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm">
              {data.executionSteps.map((step, index) => (
                <div key={index} className="text-gray-300 py-1">
                  {step}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <Card className="bg-gray-50 rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex items-center space-x-3 mb-6">
          <FileSpreadsheet className="h-6 w-6 text-indigo-600" />
          <h2 className="text-xl font-semibold text-slate-800">Agent Results</h2>
        </div>

        <div className="space-y-4">
          {data.agents.map((agent) => (
            <div key={agent.agentId} className="border rounded-lg overflow-hidden bg-white">
              <div 
                className="bg-gradient-to-r from-gray-50 to-white p-4 flex justify-between items-center cursor-pointer border-l-4 border-indigo-500"
                onClick={() => toggleAgent(agent.agentId)}
              >
                <div className="flex items-center space-x-4">
                  {expandedAgents.has(agent.agentId) ? (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-500" />
                  )}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      Agent: {agent.agentId}
                    </h3>
                    <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                      <span>
                        Status: {agent.qualified ? (
                          <span className="text-green-600 font-medium">Qualified</span>
                        ) : (
                          <span className="text-red-600 font-medium">Not Qualified</span>
                        )}
                      </span>
                      <span>
                        Commission: ₹{agent.commission.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {expandedAgents.has(agent.agentId) && (
                <div className="p-4 border-t border-gray-200">
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 mb-4">Record Processing Log</h4>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Record ID
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Rule Type
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Details
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Timestamp
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {getAgentLogs(agent.agentId).map((log, index) => (
                              <tr key={`${log.recordId}-${index}`} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {log.recordId}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRuleTypeBadgeClass(log.ruleType)}`}>
                                    {log.ruleType}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    log.matched ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                  }`}>
                                    {log.matched ? 'Matched' : 'Not Matched'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                  {log.details}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {format(new Date(log.timestamp), 'PPpp')}
                                </td>
                              </tr>
                            ))}
                            {getAgentLogs(agent.agentId).length === 0 && (
                              <tr>
                                <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                                  No processing logs available for this agent
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}