import React from 'react';
import { Plus, FileUp, Calculator } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { useNavigate } from 'react-router-dom';

export function KpiConfiguratorHome() {
  const navigate = useNavigate();

  return (
    <div className="max-w-5xl mx-auto py-12 px-4">
      <Card className="bg-gray-50 rounded-xl p-12 shadow-sm border border-gray-200">
        <div className="text-center space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-black">
            <Calculator className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-semibold text-slate-800">KPI Configuration</h1>
          <p className="text-slate-600">Create or manage your KPI configurations</p>
          
          <div className="max-w-sm mx-auto space-y-4 pt-6">
            <Button
              onClick={() => navigate('/admin/kpi-config-v3')}
              className="w-full rounded-full bg-black text-white hover:opacity-90 transition py-6"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create New Configuration
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full rounded-full border-2 hover:bg-gray-100 transition py-6"
              onClick={() => navigate('/admin/kpi-config-list')}
            >
              <FileUp className="h-5 w-5 mr-2" />
              View Existing Configurations
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}