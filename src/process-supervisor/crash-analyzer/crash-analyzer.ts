import type { DiagnosticResult } from './models/crash-report.js';
import { CRASH_RULES, type CrashRule } from './crash-rules.js';

export class CrashAnalyzer {
  private readonly rules: CrashRule[];

  constructor(customRules?: CrashRule[]) {
    this.rules = customRules ?? CRASH_RULES;
  }

  analyze(logContent: string): DiagnosticResult | null {
    if (!logContent || typeof logContent !== 'string') {
      return null;
    }

    for (const rule of this.rules) {
      const match = rule.match(logContent);
      if (match) {
        return match;
      }
    }

    return null;
  }
}
