import React from 'react';
import { AdjustmentRuleBuilder } from './AdjustmentRuleBuilder';
import type { KpiField } from '../../types';

interface AdjustmentKpiTabProps {
  adjustmentRules: any[];
  setAdjustmentRules: (rules: any[]) => void;
  disabled?: boolean;
  kpiFields?: KpiField[];
}

export function AdjustmentKpiTab({
  adjustmentRules,
  setAdjustmentRules,
  disabled = false,
  kpiFields = []
}: AdjustmentKpiTabProps) {
  return (
    <AdjustmentRuleBuilder
      rules={adjustmentRules}
      onChange={setAdjustmentRules}
      disabled={disabled}
      kpiFields={kpiFields}
      sectionName="Adjustment KPI's"
    />
  );
}