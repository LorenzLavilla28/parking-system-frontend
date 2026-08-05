import { describe, expect, it } from 'vitest';
import { buildPricingRules, parseRateRulesJson, serializeRateRules } from './pricingRules';

describe('pricing rules vehicle rates', () => {
  it('reads independent car and motorcycle rates', () => {
    const form = parseRateRulesJson(JSON.stringify({
      currency: 'PHP',
      entryGraceMinutes: 15,
      paidExitGraceMinutes: 10,
      default: { type: 'Flat', flatAmount: 50 },
      vehicleRates: {
        Car: { type: 'FirstBlock', firstHours: 3, firstAmount: 60, incrementAmount: 20, incrementUnit: 'Hour' },
        Motorcycle: { type: 'Flat', flatAmount: 25 },
      },
    }));

    expect(form.carRate).toMatchObject({ type: 'FirstBlock', firstAmount: 60, incrementAmount: 20 });
    expect(form.motorcycleRate).toMatchObject({ type: 'Flat', flatAmount: 25 });
  });

  it('reads the PascalCase canonical JSON returned by the backend', () => {
    const form = parseRateRulesJson(JSON.stringify({
      Currency: 'PHP',
      EntryGraceMinutes: 7,
      PaidExitGraceMinutes: 22,
      LostTicketFee: 650,
      Default: { Type: 'Flat', FlatAmount: 99 },
      VehicleRates: {
        Car: { Type: 'FirstBlock', FirstHours: 4, FirstAmount: 85, IncrementAmount: 15, IncrementUnit: 'Hour' },
        Motorcycle: { Type: 'PerUnit', PerUnitAmount: 12, PerUnit: 'Hour', FractionMinutes: 60 },
      },
      Overnight: { Fee: 90, StartHour: 21, EndHour: 5 },
      WeekendMultiplier: 1.25,
    }));

    expect(form).toMatchObject({
      entryGraceMinutes: 7,
      paidExitGraceMinutes: 22,
      lostTicketFee: 650,
      overnightFee: 90,
      overnightStartHour: 21,
      overnightEndHour: 5,
      weekendMultiplier: 1.25,
      carRate: { type: 'FirstBlock', firstHours: 4, firstAmount: 85, incrementAmount: 15 },
      motorcycleRate: { type: 'PerUnit', perUnitAmount: 12, perUnit: 'Hour' },
    });
  });

  it('uses the legacy default rate for both vehicle types when overrides are absent', () => {
    const form = parseRateRulesJson(JSON.stringify({
      default: { type: 'PerUnit', perUnitAmount: 30, perUnit: 'Hour', fractionMinutes: 60 },
    }));

    expect(form.carRate).toMatchObject({ type: 'PerUnit', perUnitAmount: 30 });
    expect(form.motorcycleRate).toMatchObject({ type: 'PerUnit', perUnitAmount: 30 });
  });

  it('publishes explicit car and motorcycle rates while retaining the car fallback', () => {
    const form = parseRateRulesJson(JSON.stringify({
      default: { type: 'FirstBlock', firstHours: 3, firstAmount: 50, incrementAmount: 20, incrementUnit: 'Hour' },
      vehicleRates: { Motorcycle: { type: 'Flat', flatAmount: 20 } },
    }));
    form.carRate.firstAmount = 70;
    form.motorcycleRate = { ...form.motorcycleRate, type: 'Flat', flatAmount: 30 };

    const rules = buildPricingRules(form);

    expect(rules.default).toEqual(rules.vehicleRates.Car);
    expect(rules.vehicleRates.Car).toMatchObject({ type: 'FirstBlock', firstAmount: 70 });
    expect(rules.vehicleRates.Motorcycle).toEqual({ type: 'Flat', flatAmount: 30 });
    expect(JSON.parse(serializeRateRules(form)).vehicleRates).toEqual(rules.vehicleRates);
  });
});
