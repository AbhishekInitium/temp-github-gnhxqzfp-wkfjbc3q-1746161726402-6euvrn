import type { CompensationScheme } from '../types';

interface ValidationResult {
  valid: boolean;
  errors: Array<{
    type: 'error' | 'warning';
    message: string;
    details: string[];
  }>;
}

export function validateSchemeJson(scheme: any): ValidationResult {
  const errors: ValidationResult['errors'] = [];

  // Required fields validation
  const requiredFields = [
    'name',
    'description',
    'effectiveFrom',
    'effectiveTo',
    'quotaAmount',
    'revenueBase',
    'baseMapping',
    'kpiConfig'
  ];

  requiredFields.forEach(field => {
    if (!(field in scheme)) {
      errors.push({
        type: 'error',
        message: `Missing required field: ${field}`,
        details: [`The field "${field}" must be present in the scheme configuration`]
      });
    }
  });

  // Base mapping validation
  if (scheme.baseMapping) {
    const requiredMappingFields = ['sourceFile', 'agentField', 'amountField', 'transactionDateField'];
    requiredMappingFields.forEach(field => {
      if (!(field in scheme.baseMapping)) {
        errors.push({
          type: 'error',
          message: `Missing required field in baseMapping: ${field}`,
          details: [`baseMapping must include "${field}"`]
        });
      }
    });
  }

  // Date validation
  if (scheme.effectiveFrom && scheme.effectiveTo) {
    const fromDate = new Date(scheme.effectiveFrom);
    const toDate = new Date(scheme.effectiveTo);
    
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      errors.push({
        type: 'error',
        message: 'Invalid date format',
        details: ['effectiveFrom and effectiveTo must be valid dates']
      });
    } else if (fromDate >= toDate) {
      errors.push({
        type: 'error',
        message: 'Invalid date range',
        details: ['effectiveFrom must be before effectiveTo']
      });
    }
  }

  // KPI Config validation
  if (scheme.kpiConfig) {
    if (!scheme.kpiConfig.calculationBase) {
      errors.push({
        type: 'error',
        message: 'Missing calculationBase in kpiConfig',
        details: ['kpiConfig must include calculationBase']
      });
    }

    // Validate KPI fields
    const validateKpiFields = (fields: any[], fieldType: string) => {
      if (!Array.isArray(fields)) {
        errors.push({
          type: 'error',
          message: `Invalid ${fieldType} in kpiConfig`,
          details: [`${fieldType} must be an array`]
        });
        return;
      }

      fields.forEach((field, index) => {
        if (!field.name || !field.sourceField || !field.dataType) {
          errors.push({
            type: 'error',
            message: `Invalid KPI field in ${fieldType}`,
            details: [`Field at index ${index} must have name, sourceField, and dataType`]
          });
        }
      });
    };

    validateKpiFields(scheme.kpiConfig.baseData, 'baseData');
    validateKpiFields(scheme.kpiConfig.qualificationFields, 'qualificationFields');
    validateKpiFields(scheme.kpiConfig.adjustmentFields, 'adjustmentFields');
    validateKpiFields(scheme.kpiConfig.exclusionFields, 'exclusionFields');
    if (scheme.kpiConfig.creditFields) {
      validateKpiFields(scheme.kpiConfig.creditFields, 'creditFields');
    }
  }

  // Rules validation
  if (Array.isArray(scheme.qualificationRules)) {
    scheme.qualificationRules.forEach((rule: any, index: number) => {
      if (!rule.field || !rule.operator || !('value' in rule)) {
        errors.push({
          type: 'error',
          message: `Invalid qualification rule at index ${index}`,
          details: ['Each rule must have field, operator, and value']
        });
      }
    });
  }

  if (Array.isArray(scheme.adjustmentRules)) {
    scheme.adjustmentRules.forEach((rule: any, index: number) => {
      if (!rule.condition?.field || !rule.condition?.operator || !('value' in rule.condition)) {
        errors.push({
          type: 'error',
          message: `Invalid adjustment rule condition at index ${index}`,
          details: ['condition must have field, operator, and value']
        });
      }

      if (!rule.adjustment?.target || !rule.adjustment?.type || !('value' in rule.adjustment)) {
        errors.push({
          type: 'error',
          message: `Invalid adjustment rule adjustment at index ${index}`,
          details: ['adjustment must have target, type, and value']
        });
      }
    });
  }

  // Credit splits validation
  if (Array.isArray(scheme.creditSplits)) {
    const totalPercentage = scheme.creditSplits.reduce((sum: number, split: any) => sum + (split.percentage || 0), 0);
    if (totalPercentage !== 100) {
      errors.push({
        type: 'error',
        message: 'Invalid credit splits',
        details: ['Credit split percentages must sum to 100']
      });
    }
  }

  return {
    valid: errors.filter(e => e.type === 'error').length === 0,
    errors
  };
}