import React from 'react';
import { RuleBuilder } from './RuleBuilder';
import type { KpiField } from '../../types';

interface QualificationKpiTabProps {
  qualificationRules: any[];
  setQualificationRules: (rules: any[]) => void;
  disabled?: boolean;
  kpiFields?: KpiField[];
}

export function QualificationKpiTab({
  qualificationRules,
  setQualificationRules,
  disabled = false,
  kpiFields = []
}: QualificationKpiTabProps) {
  return (
    <RuleBuilder
      rules={qualificationRules}
      onChange={setQualificationRules}
      disabled={disabled}
      kpiFields={kpiFields}
      sectionName="Qualification KPI's"
    />
  );
}