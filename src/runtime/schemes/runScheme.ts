import { Decimal } from 'decimal.js';
import { parseExcelFile } from '../../utils/excelParser';

// Add execution steps tracking
const executionSteps: string[] = [];
const logStep = (msg: string) => {
  const step = `[Step ${executionSteps.length + 1}] ${msg}`;
  console.log(step); // Log to console for debugging
  executionSteps.push(step);
  return step;
};

/**
 * Executes the incentive scheme calculation.
 * @param {object} scheme The scheme JSON object.
 * @param {object} uploadedFiles An object mapping filenames to their Excel file buffers.
 * @param {string} runAsOfDateString The date (YYYY-MM-DD) up to which transactions are considered.
 * @returns {object} Results including payouts, logs, and credit distributions.
 */
export async function runScheme(scheme: any, uploadedFiles: Record<string, ArrayBuffer>, runAsOfDateString: string) {
  // --- Initialization ---
  const runAsOfDate = parseDate(runAsOfDateString);
  if (!runAsOfDate) {
    throw new Error(`Invalid runAsOfDate: ${runAsOfDateString}`);
  }
  const effectiveFromDate = parseDate(scheme.effectiveFrom);
  runAsOfDate.setUTCHours(0, 0, 0, 0);
  if (effectiveFromDate) effectiveFromDate.setUTCHours(0, 0, 0, 0);

  logStep('Scheme execution initialized');

  const agentPayouts: Record<string, string> = {};
  const ruleHitLogs: Record<string, any[]> = {};
  const creditDistributions: Record<string, any[]> = {};
  const rawRecordLevelData: any[] = [];

  const logEvent = (logArray: any[], eventData: any) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      ...eventData,
    };
    logArray.push(logEntry);
    
    // Also add to rawRecordLevelData if it's a record-level event
    if (eventData.recordId && eventData.agentId) {
      rawRecordLevelData.push(logEntry);
    }
  };

  // Load and parse Excel files
  const baseDataFile = scheme.baseMapping?.sourceFile;
  const hierarchyFile = scheme.creditHierarchyFile;

  logStep('Loading input files');

  if (!baseDataFile || !uploadedFiles[baseDataFile]) {
    throw new Error(`Base data file "${baseDataFile}" not found in uploadedFiles.`);
  }

  let baseData = [];
  try {
    baseData = await parseExcelFile(uploadedFiles[baseDataFile]);
    logStep(`Parsed base data file: ${baseData.length} records`);
  } catch (e) {
    throw new Error(`Failed to parse base data file "${baseDataFile}": ${e instanceof Error ? e.message : 'Unknown error'}`);
  }

  let hierarchyData = [];
  if (hierarchyFile && uploadedFiles[hierarchyFile]) {
    try {
      hierarchyData = await parseExcelFile(uploadedFiles[hierarchyFile]);
      logStep(`Parsed hierarchy file: ${hierarchyData.length} records`);
    } catch (e) {
      console.warn(`Failed to parse hierarchy file "${hierarchyFile}": ${e instanceof Error ? e.message : 'Unknown error'}. Proceeding without hierarchy.`);
      hierarchyData = [];
    }
  }

  // --- 1. Base Data Selection ---
  logStep('Filtering records by date range');
  const filteredRecords = baseData.filter(record => {
    const txDateStr = record[scheme.baseMapping.transactionDateField];
    const txDate = parseDate(txDateStr);
    if (!txDate) {
      logEvent(rawRecordLevelData, {
        level: 'Warning',
        recordId: record.id || JSON.stringify(record).substring(0, 50),
        message: `Skipping record due to unparseable date: ${txDateStr}`,
        agentId: record[scheme.baseMapping.agentField] || 'Unknown',
        ruleType: 'DataError',
        matched: false,
      });
      return false;
    }
    txDate.setUTCHours(0, 0, 0, 0);

    const isAfterFrom = effectiveFromDate ? txDate.getTime() >= effectiveFromDate.getTime() : true;
    const isBeforeRunDate = txDate.getTime() <= runAsOfDate.getTime();

    return isAfterFrom && isBeforeRunDate;
  });

  logStep(`Filtered ${filteredRecords.length} records within date range`);

  // --- 2. Group by Agent ---
  logStep('Grouping records by agent');
  const agentData: Record<string, any> = {};

  for (const record of filteredRecords) {
    const agentId = record[scheme.baseMapping.agentField];
    if (!agentId) {
      logEvent(rawRecordLevelData, {
        level: 'Warning',
        recordId: record.id || 'N/A',
        message: `Record missing agent ID in field "${scheme.baseMapping.agentField}"`,
        ruleType: 'DataError',
        matched: false,
      });
      continue;
    }
    if (!agentData[agentId]) {
      agentData[agentId] = {
        records: [],
        logs: [],
        totalBaseAmount: new Decimal(0),
        totalAdjustedAmount: new Decimal(0),
        qualified: true,
        payout: new Decimal(0),
      };
    }
    if (!record.recordInternalId) {
      record.recordInternalId = `rec_${Math.random().toString(36).substring(2, 15)}`;
    }
    agentData[agentId].records.push({ ...record });
  }

  logStep(`Processing ${Object.keys(agentData).length} agents`);

  // --- 3. Record-Level Rule Application (Per Agent) ---
  // And --- 4. Agent-Level Qualification ---
  // And --- 5. Payout Tier Calculation ---
  // And --- 6. Credit Split ---

  for (const agentId in agentData) {
    logStep(`Processing agent: ${agentId}`);
    const agentInfo = agentData[agentId];
    let processedRecords = [];

    // Process each record for exclusions and adjustments
    for (const record of agentInfo.records) {
      let isExcluded = false;
      let currentAmount = new Decimal(0);
      let rateMultiplier = new Decimal(1);

      const baseAmountField = scheme.baseMapping.amountField;
      const baseAmountValue = record[baseAmountField];
      try {
        currentAmount = new Decimal(baseAmountValue || 0);
      } catch (e) {
        logEvent(rawRecordLevelData, {
          ruleType: 'DataError',
          recordId: record.recordInternalId,
          agentId: agentId,
          matched: true,
          reason: `Invalid amount value: ${baseAmountValue}`,
        });
        isExcluded = true;
      }
      if (!isExcluded) {
        agentInfo.totalBaseAmount = agentInfo.totalBaseAmount.add(currentAmount);
      }

      // Exclusion Rules
      if (!isExcluded && Array.isArray(scheme.exclusionRules)) {
        for (const rule of scheme.exclusionRules) {
          const fieldDef = scheme.kpiConfig.exclusionFields.find((f: any) => f.name === rule.field);
          if (!fieldDef) {
            console.warn(`Exclusion rule ${rule.id} references unknown field: ${rule.field}`);
            continue;
          }
          const recordValue = record[fieldDef.sourceField];
          if (evaluateRule(recordValue, rule.operator, rule.value, fieldDef.dataType)) {
            logEvent(rawRecordLevelData, {
              ruleType: 'Exclusion',
              ruleId: rule.id,
              recordId: record.recordInternalId,
              agentId: agentId,
              matched: true,
              reason: `${rule.field} (${recordValue}) ${rule.operator} ${rule.value}`,
            });
            isExcluded = true;
            break;
          }
        }
      }

      if (isExcluded) {
        continue;
      }

      // Adjustment Rules
      if (Array.isArray(scheme.adjustmentRules)) {
        for (const rule of scheme.adjustmentRules) {
          const fieldDef = scheme.kpiConfig.adjustmentFields.find((f: any) => f.name === rule.condition.field);
          if (!fieldDef) {
            console.warn(`Adjustment rule ${rule.id} references unknown condition field: ${rule.condition.field}`);
            continue;
          }
          const recordValue = record[fieldDef.sourceField];

          if (evaluateRule(recordValue, rule.condition.operator, rule.condition.value, fieldDef.dataType)) {
            const adj = rule.adjustment;
            let adjustmentEffectDescription = '';

            if (adj.target === 'Amount') {
              const adjValue = new Decimal(adj.value);
              if (adj.type === 'percentage') {
                const change = currentAmount.times(adjValue).div(100);
                currentAmount = currentAmount.add(change);
                adjustmentEffectDescription = `Amount adjusted by ${adjValue}% to ${currentAmount.toFixed(2)}`;
              } else if (adj.type === 'fixed') {
                currentAmount = currentAmount.add(adjValue);
                adjustmentEffectDescription = `Amount adjusted by fixed ${adjValue} to ${currentAmount.toFixed(2)}`;
              }
            } else if (adj.target === 'Rate') {
              const adjValue = new Decimal(adj.value);
              if (adj.type === 'percentage') {
                rateMultiplier = rateMultiplier.times(adjValue.div(100));
                adjustmentEffectDescription = `Rate multiplier adjusted by ${adjValue}% resulting in new multiplier ${rateMultiplier.toFixed(2)}`;
              } else if (adj.type === 'fixed') {
                rateMultiplier = rateMultiplier.times(adjValue);
                adjustmentEffectDescription = `Rate multiplier adjusted by factor ${adjValue} resulting in new multiplier ${rateMultiplier.toFixed(2)}`;
              }
            }

            logEvent(rawRecordLevelData, {
              ruleType: 'Adjustment',
              ruleId: rule.id,
              recordId: record.recordInternalId,
              agentId: agentId,
              matched: true,
              condition: `${rule.condition.field} (${recordValue}) ${rule.condition.operator} ${rule.condition.value}`,
              effect: adjustmentEffectDescription,
            });
          }
        }
      }

      // Custom Rules Hook
      if (scheme.customRules && scheme.customRules.length > 0) {
        logEvent(rawRecordLevelData, {
          ruleType: 'Custom',
          recordId: record.recordInternalId,
          agentId: agentId,
          message: 'Custom rule hook executed (implement logic if needed).',
        });
      }

      const finalRecordAmount = currentAmount.times(rateMultiplier);
      record.adjustedAmount = finalRecordAmount;

      agentInfo.totalAdjustedAmount = agentInfo.totalAdjustedAmount.add(finalRecordAmount);
      processedRecords.push(record);
    }

    agentInfo.records = processedRecords;

    // Agent-Level Qualification
    if (Array.isArray(scheme.qualificationRules)) {
      for (const rule of scheme.qualificationRules) {
        const fieldDef = scheme.kpiConfig.qualificationFields.find((f: any) => f.name === rule.field);
        if (!fieldDef) {
          console.warn(`Qualification rule ${rule.id} references unknown field: ${rule.field}`);
          continue;
        }

        let valueToEvaluate;
        let evaluationDescription = '';

        if (fieldDef.evaluationLevel === 'Per Agent') {
          if (fieldDef.aggregation === 'Sum') {
            valueToEvaluate = agentInfo.records.reduce((sum: Decimal, rec: any) => {
              try {
                const val = fieldDef.sourceField === scheme.baseMapping.amountField && rec.adjustedAmount !== undefined
                  ? rec.adjustedAmount
                  : new Decimal(rec[fieldDef.sourceField] || 0);
                return sum.add(val);
              } catch (e) {
                logEvent(agentInfo.logs, {
                  level: 'Warning',
                  ruleId: rule.id,
                  message: `Could not sum value ${rec[fieldDef.sourceField]} for record ${rec.recordInternalId}`,
                });
                return sum;
              }
            }, new Decimal(0));
            evaluationDescription = `Sum of ${fieldDef.sourceField} = ${valueToEvaluate.toFixed(2)}`;
          } else if (fieldDef.aggregation === 'Count') {
            valueToEvaluate = new Decimal(agentInfo.records.length);
            evaluationDescription = `Count of records = ${valueToEvaluate}`;
          } else {
            console.warn(`Unsupported agent-level aggregation: ${fieldDef.aggregation}`);
            logEvent(agentInfo.logs, {
              level: 'Error',
              ruleId: rule.id,
              message: `Unsupported aggregation ${fieldDef.aggregation}`,
            });
            continue;
          }
        } else {
          let foundMatch = false;
          for (const rec of agentInfo.records) {
            if (evaluateRule(rec[fieldDef.sourceField], rule.operator, rule.value, fieldDef.dataType)) {
              foundMatch = true;
              break;
            }
          }
          valueToEvaluate = foundMatch;
          rule.value = true;
          rule.operator = '=';
          fieldDef.dataType = 'Boolean';
          evaluationDescription = `At least one record matched ${rule.field} ${rule.operator} ${rule.value}`;
        }

        const ruleMet = evaluateRule(valueToEvaluate, rule.operator, rule.value, fieldDef.dataType);

        logEvent(rawRecordLevelData, {
          ruleType: 'Qualification',
          ruleId: rule.id,
          agentId: agentId,
          matched: ruleMet,
          condition: `${rule.field} ${rule.operator} ${rule.value}`,
          evaluation: evaluationDescription,
          evaluatedValue: valueToEvaluate.toString(),
        });

        if (!ruleMet) {
          agentInfo.qualified = false;
          logEvent(rawRecordLevelData, {
            ruleType: 'Qualification',
            agentId: agentId,
            matched: false,
            reason: `Agent disqualified by rule ${rule.id}.`,
          });
          break;
        }
      }
    }

    // Payout Tier Calculation
    if (agentInfo.qualified) {
      const quota = scheme.quotaAmount ? new Decimal(scheme.quotaAmount) : new Decimal(0);
      let amountForTierCalc = agentInfo.totalAdjustedAmount;
      let meetsQuota = true;

      if (quota.gt(0)) {
        if (agentInfo.totalAdjustedAmount.lt(quota)) {
          meetsQuota = false;
          logEvent(rawRecordLevelData, {
            ruleType: 'Quota',
            agentId: agentId,
            matched: false,
            reason: `Total adjusted amount ${amountForTierCalc.toFixed(2)} is less than quota ${quota.toFixed(2)}. No payout.`,
          });
          agentInfo.payout = new Decimal(0);
        } else {
          logEvent(rawRecordLevelData, {
            ruleType: 'Quota',
            agentId: agentId,
            matched: true,
            reason: `Total adjusted amount ${amountForTierCalc.toFixed(2)} meets quota ${quota.toFixed(2)}.`,
          });
        }
      }

      if (meetsQuota) {
        agentInfo.payout = calculateTieredPayout(amountForTierCalc, scheme.payoutTiers);
        logEvent(rawRecordLevelData, {
          ruleType: 'PayoutCalculation',
          agentId: agentId,
          baseAmount: amountForTierCalc.toFixed(2),
          payoutAmount: agentInfo.payout.toFixed(2),
          tiersUsed: scheme.payoutTiers
            .map((t: any) => `[${t.from}-${t.to || 'inf'}]@${t.rate}${t.isPercentage ? '%' : ''}`)
            .join(', '),
        });
      }
    } else {
      agentInfo.payout = new Decimal(0);
    }

    agentPayouts[agentId] = agentInfo.payout.toFixed(2);

    // Credit Split
    if (agentInfo.qualified && agentInfo.payout.gt(0) && hierarchyData.length > 0 && Array.isArray(scheme.creditSplits)) {
      if (!creditDistributions[agentId]) creditDistributions[agentId] = [];

      const basePayoutForSplit = agentInfo.payout;
      let currentAgentForLookup = agentId;
      let level = 1;

      for (const splitRule of scheme.creditSplits) {
        if (!splitRule || !splitRule.role || typeof splitRule.percentage !== 'number') {
          console.warn('Invalid credit split rule:', splitRule);
          continue;
        }

        const role = splitRule.role;
        const percentage = new Decimal(splitRule.percentage);
        let targetAgentId = null;
        let managerDetails = null;
        let resolvedUsing = 'Direct Assignment';

        if (role === 'L1') {
          targetAgentId = agentId;
        } else {
          const targetLevel = parseInt(role.substring(1));
          if (!isNaN(targetLevel) && targetLevel > level) {
            for (let i = level; i < targetLevel; i++) {
              managerDetails = findManager(hierarchyData, currentAgentForLookup, runAsOfDate);

              if (managerDetails) {
                currentAgentForLookup = managerDetails.managerId;
                level++;
              } else {
                logEvent(creditDistributions[agentId], {
                  level: 'Warning',
                  fromAgent: agentId,
                  targetRole: role,
                  lookupAgent: currentAgentForLookup,
                  message: `Could not find manager in hierarchy for level ${level} lookup. Skipping role ${role}.`,
                  resolvedUsing: scheme.creditHierarchyFile,
                });
                currentAgentForLookup = null;
                break;
              }
            }
            if (currentAgentForLookup && level === targetLevel) {
              targetAgentId = currentAgentForLookup;
              resolvedUsing = scheme.creditHierarchyFile;
            }
          } else if (!isNaN(targetLevel) && targetLevel === level) {
            console.warn(`Credit split logic warning: Role ${role} corresponds to current level ${level}. Assigning to current lookup agent ${currentAgentForLookup}.`);
            targetAgentId = currentAgentForLookup;
          } else if (isNaN(targetLevel)) {
            console.warn(`Cannot parse level from credit split role: ${role}`);
          }
        }

        if (targetAgentId) {
          const creditAmount = basePayoutForSplit.times(percentage).div(100);
          if (creditAmount.gt(0)) {
            logEvent(creditDistributions[agentId], {
              fromAgent: agentId,
              toAgent: targetAgentId,
              level: role,
              percentage: splitRule.percentage,
              amount: creditAmount.toFixed(2),
              resolvedUsing: resolvedUsing,
              validDuring: managerDetails ? `${managerDetails.validFrom} to ${managerDetails.validTo}` : 'N/A',
            });
          }
        } else {
          if (role !== 'L1') {
            logEvent(creditDistributions[agentId], {
              level: 'Info',
              fromAgent: agentId,
              targetRole: role,
              message: `Skipping credit split for role ${role} as target agent could not be determined via hierarchy.`,
              resolvedUsing: scheme.creditHierarchyFile,
            });
          }
        }
      }
    }

    if (agentInfo.logs.length > 0) {
      ruleHitLogs[agentId] = agentInfo.logs;
    }
  }

  logStep('Scheme execution completed');

  return {
    agentPayouts,
    ruleHitLogs,
    creditDistributions,
    rawRecordLevelData,
    executionSteps
  };
}

/**
 * Parses a date string into a Date object. Supports YYYY-MM-DD and DD-MM-YYYY formats.
 * @param {string} dateString The date string.
 * @returns {Date | null} The Date object or null if invalid.
 */
function parseDate(dateString: string): Date | null {
  if (!dateString) return null;

  // Replace both - and / with - for consistent processing
  const normalizedDate = dateString.replace(/\//g, '-');
  
  // Check if it's DD-MM-YYYY format
  const ddmmyyyyRegex = /^(\d{2})-(\d{2})-(\d{4})$/;
  const ddmmyyyyMatch = normalizedDate.match(ddmmyyyyRegex);
  
  // Check if it's YYYY-MM-DD format
  const yyyymmddRegex = /^(\d{4})-(\d{2})-(\d{2})$/;
  const yyyymmddMatch = normalizedDate.match(yyyymmddRegex);

  let year: number, month: number, day: number;

  if (ddmmyyyyMatch) {
    // DD-MM-YYYY format
    day = parseInt(ddmmyyyyMatch[1], 10);
    month = parseInt(ddmmyyyyMatch[2], 10) - 1; // Months are 0-based
    year = parseInt(ddmmyyyyMatch[3], 10);
  } else if (yyyymmddMatch) {
    // YYYY-MM-DD format
    year = parseInt(yyyymmddMatch[1], 10);
    month = parseInt(yyyymmddMatch[2], 10) - 1;
    day = parseInt(yyyymmddMatch[3], 10);
  } else {
    console.warn(`Invalid date format: ${dateString}. Expected DD-MM-YYYY or YYYY-MM-DD`);
    return null;
  }

  // Create date in UTC
  const date = new Date(Date.UTC(year, month, day));

  // Add IST offset (+5:30)
  date.setUTCHours(5, 30, 0, 0);

  // Validate the parsed date
  if (isNaN(date.getTime())) {
    console.warn(`Could not parse date string: ${dateString}`);
    return null;
  }

  return date;
}

/**
 * Evaluates if a record field matches a rule condition.
 * @param {*} recordValue The value from the record.
 * @param {string} operator The comparison operator (e.g., '=', '>=', 'CONTAINS').
 * @param {string | number} ruleValue The value from the rule definition.
 * @param {string} dataType Data type hint ('String', 'Number', 'Date').
 * @returns {boolean} True if the rule matches, false otherwise.
 */
function evaluateRule(recordValue: any, operator: string, ruleValue: any, dataType = 'String'): boolean {
  let rv = recordValue;
  let v = ruleValue;

  if (dataType === 'Number') {
    try {
      rv = new Decimal(recordValue);
      v = new Decimal(ruleValue);
    } catch (e) {
      console.warn(`Could not parse value as Decimal for comparison: record='${recordValue}', rule='${ruleValue}'`);
      return false;
    }
  } else if (dataType === 'Date') {
    if (!(rv instanceof Date) || !(v instanceof Date)) {
      console.warn(`Date comparison expects Date objects, got: record='${typeof rv}', rule='${typeof v}'`);
      return false;
    }
  } else {
    rv = String(recordValue);
    v = String(ruleValue);
  }

  switch (operator) {
    case '=':
      return dataType === 'Number' ? rv.equals(v) : rv === v;
    case '>=':
      return dataType === 'Number' ? rv.gte(v) : rv >= v;
    case '<=':
      return dataType === 'Number' ? rv.lte(v) : rv <= v;
    case '>':
      return dataType === 'Number' ? rv.gt(v) : rv > v;
    case '<':
      return dataType === 'Number' ? rv.lt(v) : rv < v;
    case 'CONTAINS':
      return String(rv).includes(String(v));
    case '!=':
      return dataType === 'Number' ? !rv.equals(v) : rv !== v;
    default:
      console.warn(`Unsupported operator: ${operator}`);
      return false;
  }
}

/**
 * Calculates the payout based on marginal tiers.
 * @param {Decimal} amount The total amount to apply tiers to.
 * @param {object[]} tiers The payoutTiers array from the scheme.
 * @returns {Decimal} The calculated tiered payout.
 */
function calculateTieredPayout(amount: Decimal, tiers: any[]): Decimal {
  let totalPayout = new Decimal(0);
  const sortedTiers = [...tiers].sort((a, b) => a.from - b.from);

  for (const tier of sortedTiers) {
    const tierFrom = new Decimal(tier.from);
    const tierTo = tier.to != null ? new Decimal(tier.to) : Decimal.Infinity;
    const tierRate = new Decimal(tier.rate);
    const isPercentage = tier.isPercentage;

    const tierRangeStart = tierFrom;
    const tierRangeEnd = tierTo;

    const amountInTier = Decimal.max(0,
      Decimal.min(amount, tierRangeEnd).minus(tierRangeStart)
    );

    if (amountInTier.isZero() && amount.gt(tierRangeEnd)) {
      continue;
    }
    if (amountInTier.isZero() && amount.lte(tierRangeStart)) {
      break;
    }

    let payoutForTier;
    if (isPercentage) {
      payoutForTier = amountInTier.times(tierRate).div(100);
    } else {
      payoutForTier = amountInTier.times(tierRate);
    }

    totalPayout = totalPayout.add(payoutForTier);

    if (amount.lte(tierRangeEnd)) {
      break;
    }
  }

  return totalPayout;
}

/**
 * Finds the manager for a given agent ID from the hierarchy data, valid on a specific date.
 * @param {object[]} hierarchyData Parsed hierarchy data.
 * @param {string} agentId The ID of the agent whose manager is needed.
 * @param {Date} transactionDate The date for which the hierarchy must be valid.
 * @returns {{ managerId: string, validFrom: string, validTo: string } | null} Manager details or null if not found/valid.
 */
function findManager(hierarchyData: any[], agentId: string, transactionDate: Date) {
  if (!hierarchyData || !agentId || !(transactionDate instanceof Date)) {
    return null;
  }
  // Normalize transactionDate to UTC midnight for comparison
  const targetDate = new Date(Date.UTC(transactionDate.getUTCFullYear(), transactionDate.getUTCMonth(), transactionDate.getUTCDate()));

  for (const record of hierarchyData) {
    if (record['Sales Employee'] === agentId) {
      const fromDate = parseDate(record['Reports From']);
      const toDate = parseDate(record['Reports To']); // Handle potentially missing 'Reports To'

      // Check date validity: fromDate <= transactionDate <= toDate
      // If toDate is null/invalid, assume it's valid indefinitely from fromDate.
      const isAfterFrom = fromDate ? fromDate.getTime() <= targetDate.getTime() : false;
      const isBeforeTo = toDate ? targetDate.getTime() <= toDate.getTime() : true;

      if (isAfterFrom && isBeforeTo) {
        return {
          managerId: record['Reports To Person'],
          validFrom: record['Reports From'],
          validTo: record['Reports To'] || 'Indefinite',
        };
      }
    }
  }
  return null;
}