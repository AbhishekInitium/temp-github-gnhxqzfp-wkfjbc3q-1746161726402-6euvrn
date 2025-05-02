import { format } from 'date-fns';
import type { CompensationScheme, KpiConfig } from '../types';

/**
 * Clean KPI fields by removing temporary UI state
 */
function cleanKpiFields(fields: any[] = []): any[] {
  return fields.map(field => ({
    id: field.id,
    name: field.name,
    description: field.description,
    sourceType: field.sourceType,
    sourceField: field.sourceField,
    sourceFile: field.sourceFile?.replace('.csv', '.xlsx'),
    dataType: field.dataType,
    evaluationLevel: field.evaluationLevel,
    aggregation: field.aggregation
  }));
}

/**
 * Clean KPI config by removing temporary state and ensuring Excel extensions
 */
function cleanKpiConfig(config: KpiConfig): KpiConfig {
  if (!config) return config;

  return {
    name: config.name,
    calculationBase: config.calculationBase,
    baseData: cleanKpiFields(config.baseData),
    qualificationFields: cleanKpiFields(config.qualificationFields),
    adjustmentFields: cleanKpiFields(config.adjustmentFields),
    exclusionFields: cleanKpiFields(config.exclusionFields),
    creditFields: cleanKpiFields(config.creditFields)
  };
}

/**
 * Clean rules by removing temporary UI state
 */
function cleanRules(rules: any[] = []): any[] {
  return rules.map(rule => {
    const cleanRule = { ...rule };
    delete cleanRule.isNew;
    delete cleanRule.isEditing;
    delete cleanRule.originalValues;
    delete cleanRule.validationError;
    return cleanRule;
  });
}

/**
 * Generate a new scheme ID based on name and timestamp
 */
export function generateSchemeId(name: string): string {
  const timestamp = format(new Date(), 'ddMMyy_HHmm');
  return `S_${name.toUpperCase()}_${timestamp}`;
}

/**
 * Clean scheme data for saving by removing temporary state and ensuring Excel extensions
 */
export function cleanSchemeForSave(scheme: CompensationScheme): CompensationScheme {
  // Create a clean copy
  const cleanScheme = { ...scheme };

  // Update file extensions to .xlsx
  cleanScheme.baseMapping = {
    ...scheme.baseMapping,
    sourceFile: scheme.baseMapping.sourceFile.replace('.csv', '.xlsx')
  };

  if (scheme.creditHierarchyFile) {
    cleanScheme.creditHierarchyFile = scheme.creditHierarchyFile.replace('.csv', '.xlsx');
  }

  // Clean KPI configuration
  cleanScheme.kpiConfig = cleanKpiConfig(scheme.kpiConfig);

  // Clean rules
  cleanScheme.qualificationRules = cleanRules(scheme.qualificationRules);
  cleanScheme.adjustmentRules = cleanRules(scheme.adjustmentRules);
  cleanScheme.exclusionRules = cleanRules(scheme.exclusionRules);
  cleanScheme.creditRules = cleanRules(scheme.creditRules);
  cleanScheme.creditSplits = cleanRules(scheme.creditSplits);
  cleanScheme.payoutTiers = cleanRules(scheme.payoutTiers);
  cleanScheme.customRules = cleanRules(scheme.customRules);

  // Handle versioning
  if (!scheme.SchemeID) {
    // New scheme
    cleanScheme.SchemeID = generateSchemeId(scheme.name.substring(0, 10));
    cleanScheme.versionNumber = 1;
  } else {
    // Existing scheme - increment version
    cleanScheme.versionNumber = (scheme.versionNumber || 1) + 1;
  }

  return cleanScheme;
}

/**
 * Clean scheme data for viewing by removing any temporary state
 */
export function cleanSchemeForView(scheme: CompensationScheme): CompensationScheme {
  const cleanScheme = { ...scheme };
  
  // Clean KPI configuration
  cleanScheme.kpiConfig = cleanKpiConfig(scheme.kpiConfig);

  // Clean rules
  cleanScheme.qualificationRules = cleanRules(scheme.qualificationRules);
  cleanScheme.adjustmentRules = cleanRules(scheme.adjustmentRules);
  cleanScheme.exclusionRules = cleanRules(scheme.exclusionRules);
  cleanScheme.creditRules = cleanRules(scheme.creditRules);
  cleanScheme.creditSplits = cleanRules(scheme.creditSplits);
  cleanScheme.payoutTiers = cleanRules(scheme.payoutTiers);
  cleanScheme.customRules = cleanRules(scheme.customRules);

  // Remove any UI-specific fields
  const {
    isNew,
    isEditing,
    originalValues,
    validationError,
    ...finalScheme
  } = cleanScheme as any;

  return finalScheme;
}