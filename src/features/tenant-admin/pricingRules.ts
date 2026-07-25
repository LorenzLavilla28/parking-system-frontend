export type PricingType = 'Flat' | 'FirstBlock' | 'PerUnit';
export type PricingUnit = 'Hour' | 'Minute' | 'Fraction';

export interface RateBlockForm {
  type: PricingType;
  flatAmount: number;
  firstHours: number;
  firstAmount: number;
  incrementAmount: number;
  incrementUnit: PricingUnit;
  perUnitAmount: number;
  perUnit: PricingUnit;
  fractionMinutes: number;
}

export interface RateRulesForm {
  currency: string;
  entryGraceMinutes: number;
  paidExitGraceMinutes: number;
  lostTicketFee: number | '';
  enableOvernight: boolean;
  overnightFee: number;
  overnightStartHour: number;
  overnightEndHour: number;
  weekendMultiplier: number | '';
  holidayMultiplier: number | '';
  defaultRate: RateBlockForm;
}

export interface PricingRulesJson {
  currency: string;
  entryGraceMinutes: number;
  paidExitGraceMinutes: number;
  default: PricingRuleBlockJson;
  weekendMultiplier?: number;
  holidayMultiplier?: number;
  overnight?: {
    fee: number;
    startHour: number;
    endHour: number;
  };
  lostTicketFee?: number;
}

type PricingRuleBlockJson =
  | {
      type: 'Flat';
      flatAmount: number;
    }
  | {
      type: 'FirstBlock';
      firstHours: number;
      firstAmount: number;
      incrementAmount: number;
      incrementUnit: PricingUnit;
    }
  | {
      type: 'PerUnit';
      perUnitAmount: number;
      perUnit: PricingUnit;
      fractionMinutes: number;
    };

const defaultRate: RateBlockForm = {
  type: 'FirstBlock',
  flatAmount: 70,
  firstHours: 3,
  firstAmount: 50,
  incrementAmount: 20,
  incrementUnit: 'Hour',
  perUnitAmount: 20,
  perUnit: 'Hour',
  fractionMinutes: 60,
};

export const DEFAULT_RATE_RULES_FORM: RateRulesForm = {
  currency: 'PHP',
  entryGraceMinutes: 15,
  paidExitGraceMinutes: 15,
  lostTicketFee: 500,
  enableOvernight: true,
  overnightFee: 80,
  overnightStartHour: 22,
  overnightEndHour: 6,
  weekendMultiplier: '',
  holidayMultiplier: '',
  defaultRate,
};

const toNumberOrEmpty = (value: unknown): number | '' => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : '';
};

const readRateBlock = (value: unknown): RateBlockForm => {
  const block = typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
  const type = block.type === 'Flat' || block.type === 'PerUnit' || block.type === 'FirstBlock' ? block.type : 'FirstBlock';
  const incrementUnit = readUnit(block.incrementUnit, 'Hour');
  const perUnit = readUnit(block.perUnit, 'Hour');

  return {
    ...defaultRate,
    type,
    flatAmount: Number(block.flatAmount ?? defaultRate.flatAmount),
    firstHours: Number(block.firstHours ?? defaultRate.firstHours),
    firstAmount: Number(block.firstAmount ?? defaultRate.firstAmount),
    incrementAmount: Number(block.incrementAmount ?? defaultRate.incrementAmount),
    incrementUnit,
    perUnitAmount: Number(block.perUnitAmount ?? defaultRate.perUnitAmount),
    perUnit,
    fractionMinutes: Number(block.fractionMinutes ?? defaultRate.fractionMinutes),
  };
};

const readUnit = (value: unknown, fallback: PricingUnit): PricingUnit => {
  if (value === 'Hour' || value === 'Minute' || value === 'Fraction') return value;
  return fallback;
};

export function parseRateRulesJson(rulesJson?: string): RateRulesForm {
  if (!rulesJson) return DEFAULT_RATE_RULES_FORM;

  try {
    const parsed = JSON.parse(rulesJson) as Record<string, unknown>;
    const overnight =
      typeof parsed.overnight === 'object' && parsed.overnight !== null
        ? (parsed.overnight as Record<string, unknown>)
        : null;

    return {
      currency: String(parsed.currency ?? DEFAULT_RATE_RULES_FORM.currency),
      entryGraceMinutes: Number(parsed.entryGraceMinutes ?? DEFAULT_RATE_RULES_FORM.entryGraceMinutes),
      paidExitGraceMinutes: Number(parsed.paidExitGraceMinutes ?? DEFAULT_RATE_RULES_FORM.paidExitGraceMinutes),
      lostTicketFee: toNumberOrEmpty(parsed.lostTicketFee),
      enableOvernight: Boolean(overnight),
      overnightFee: Number(overnight?.fee ?? DEFAULT_RATE_RULES_FORM.overnightFee),
      overnightStartHour: Number(overnight?.startHour ?? DEFAULT_RATE_RULES_FORM.overnightStartHour),
      overnightEndHour: Number(overnight?.endHour ?? DEFAULT_RATE_RULES_FORM.overnightEndHour),
      weekendMultiplier: toNumberOrEmpty(parsed.weekendMultiplier),
      holidayMultiplier: toNumberOrEmpty(parsed.holidayMultiplier),
      defaultRate: readRateBlock(parsed.default),
    };
  } catch {
    return DEFAULT_RATE_RULES_FORM;
  }
}

export function buildPricingRules(form: RateRulesForm): PricingRulesJson {
  const rules: PricingRulesJson = {
    currency: form.currency,
    entryGraceMinutes: form.entryGraceMinutes,
    paidExitGraceMinutes: form.paidExitGraceMinutes,
    default: buildRateBlock(form.defaultRate),
  };

  if (form.weekendMultiplier !== '') rules.weekendMultiplier = form.weekendMultiplier;
  if (form.holidayMultiplier !== '') rules.holidayMultiplier = form.holidayMultiplier;
  if (form.lostTicketFee !== '') rules.lostTicketFee = form.lostTicketFee;
  if (form.enableOvernight) {
    rules.overnight = {
      fee: form.overnightFee,
      startHour: form.overnightStartHour,
      endHour: form.overnightEndHour,
    };
  }

  return rules;
}

export function serializeRateRules(form: RateRulesForm) {
  return JSON.stringify(buildPricingRules(form), null, 2);
}

export function describeRateRules(form: RateRulesForm) {
  const rate = form.defaultRate;
  const base =
    rate.type === 'Flat'
      ? `Flat ${formatPeso(rate.flatAmount)} per stay`
      : rate.type === 'PerUnit'
        ? `${formatPeso(rate.perUnitAmount)} per ${rate.perUnit.toLowerCase()}`
        : `${formatPeso(rate.firstAmount)} for first ${rate.firstHours} hours, then ${formatPeso(rate.incrementAmount)} per ${rate.incrementUnit.toLowerCase()}`;
  const grace = `${form.entryGraceMinutes} min entry grace; ${form.paidExitGraceMinutes} min paid-exit grace`;
  return `${base}; ${grace}.`;
}

function buildRateBlock(rate: RateBlockForm): PricingRuleBlockJson {
  if (rate.type === 'Flat') {
    return {
      type: rate.type,
      flatAmount: rate.flatAmount,
    };
  }

  if (rate.type === 'PerUnit') {
    return {
      type: rate.type,
      perUnitAmount: rate.perUnitAmount,
      perUnit: rate.perUnit,
      fractionMinutes: rate.fractionMinutes,
    };
  }

  return {
    type: rate.type,
    firstHours: rate.firstHours,
    firstAmount: rate.firstAmount,
    incrementAmount: rate.incrementAmount,
    incrementUnit: rate.incrementUnit,
  };
}

function formatPeso(amount: number) {
  return `PHP ${amount.toLocaleString('en-PH')}`;
}
