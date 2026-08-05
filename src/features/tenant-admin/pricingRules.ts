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
  carRate: RateBlockForm;
  motorcycleRate: RateBlockForm;
}

export interface PricingRulesJson {
  currency: string;
  entryGraceMinutes: number;
  paidExitGraceMinutes: number;
  default: PricingRuleBlockJson;
  vehicleRates: {
    Car: PricingRuleBlockJson;
    Motorcycle: PricingRuleBlockJson;
  };
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
  carRate: { ...defaultRate },
  motorcycleRate: { ...defaultRate },
};

const toNumberOrEmpty = (value: unknown): number | '' => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : '';
};

const readProperty = (record: Record<string, unknown>, name: string): unknown => {
  const exactValue = record[name];
  if (exactValue !== undefined) return exactValue;
  const matchingKey = Object.keys(record).find((key) => key.toLocaleLowerCase() === name.toLocaleLowerCase());
  return matchingKey === undefined ? undefined : record[matchingKey];
};

const readRateBlock = (value: unknown): RateBlockForm => {
  const block = typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
  const rawType = readProperty(block, 'type');
  const type = rawType === 'Flat' || rawType === 'PerUnit' || rawType === 'FirstBlock' ? rawType : 'FirstBlock';
  const incrementUnit = readUnit(readProperty(block, 'incrementUnit'), 'Hour');
  const perUnit = readUnit(readProperty(block, 'perUnit'), 'Hour');

  return {
    ...defaultRate,
    type,
    flatAmount: Number(readProperty(block, 'flatAmount') ?? defaultRate.flatAmount),
    firstHours: Number(readProperty(block, 'firstHours') ?? defaultRate.firstHours),
    firstAmount: Number(readProperty(block, 'firstAmount') ?? defaultRate.firstAmount),
    incrementAmount: Number(readProperty(block, 'incrementAmount') ?? defaultRate.incrementAmount),
    incrementUnit,
    perUnitAmount: Number(readProperty(block, 'perUnitAmount') ?? defaultRate.perUnitAmount),
    perUnit,
    fractionMinutes: Number(readProperty(block, 'fractionMinutes') ?? defaultRate.fractionMinutes),
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
    const overnightValue = readProperty(parsed, 'overnight');
    const overnight =
      typeof overnightValue === 'object' && overnightValue !== null
        ? (overnightValue as Record<string, unknown>)
        : null;
    const vehicleRatesValue = readProperty(parsed, 'vehicleRates');
    const vehicleRates =
      typeof vehicleRatesValue === 'object' && vehicleRatesValue !== null
        ? (vehicleRatesValue as Record<string, unknown>)
        : {};
    const carRate = readRateBlock(readProperty(vehicleRates, 'Car') ?? readProperty(parsed, 'default'));

    return {
      currency: String(readProperty(parsed, 'currency') ?? DEFAULT_RATE_RULES_FORM.currency),
      entryGraceMinutes: Number(readProperty(parsed, 'entryGraceMinutes') ?? DEFAULT_RATE_RULES_FORM.entryGraceMinutes),
      paidExitGraceMinutes: Number(readProperty(parsed, 'paidExitGraceMinutes') ?? DEFAULT_RATE_RULES_FORM.paidExitGraceMinutes),
      lostTicketFee: toNumberOrEmpty(readProperty(parsed, 'lostTicketFee')),
      enableOvernight: Boolean(overnight),
      overnightFee: Number((overnight ? readProperty(overnight, 'fee') : undefined) ?? DEFAULT_RATE_RULES_FORM.overnightFee),
      overnightStartHour: Number((overnight ? readProperty(overnight, 'startHour') : undefined) ?? DEFAULT_RATE_RULES_FORM.overnightStartHour),
      overnightEndHour: Number((overnight ? readProperty(overnight, 'endHour') : undefined) ?? DEFAULT_RATE_RULES_FORM.overnightEndHour),
      weekendMultiplier: toNumberOrEmpty(readProperty(parsed, 'weekendMultiplier')),
      holidayMultiplier: toNumberOrEmpty(readProperty(parsed, 'holidayMultiplier')),
      carRate,
      motorcycleRate: readRateBlock(readProperty(vehicleRates, 'Motorcycle') ?? carRate),
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
    default: buildRateBlock(form.carRate),
    vehicleRates: {
      Car: buildRateBlock(form.carRate),
      Motorcycle: buildRateBlock(form.motorcycleRate),
    },
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
  const car = describeRateBlock(form.carRate);
  const motorcycle = describeRateBlock(form.motorcycleRate);
  const grace = `${form.entryGraceMinutes} min entry grace; ${form.paidExitGraceMinutes} min paid-exit grace`;
  return `Cars: ${car}. Motorcycles: ${motorcycle}. ${grace}.`;
}

export function describeRateBlock(rate: RateBlockForm) {
  const base =
    rate.type === 'Flat'
      ? `Flat ${formatPeso(rate.flatAmount)} per stay`
      : rate.type === 'PerUnit'
        ? `${formatPeso(rate.perUnitAmount)} per ${rate.perUnit.toLowerCase()}`
        : `${formatPeso(rate.firstAmount)} for first ${rate.firstHours} hours, then ${formatPeso(rate.incrementAmount)} per ${rate.incrementUnit.toLowerCase()}`;
  return base;
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
