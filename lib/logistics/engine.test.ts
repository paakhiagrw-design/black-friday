import { describe, expect, it } from 'vitest';
import { evaluateReturn, type EngineCandidateInput, type EngineInput } from './engine';

const returner = { customerId: 1, name: 'Aoife', address: 'Dublin 2', lat: 53.3498, lng: -6.2603, label: 'Aoife' };

function buyer(id: number, lat: number, lng: number, extra: Partial<EngineCandidateInput> = {}): EngineCandidateInput {
  return {
    buyerOrderId: id,
    buyer: { customerId: 100 + id, name: `Buyer ${id}`, address: 'Dublin', lat, lng, label: `Buyer ${id}` },
    orderCreatedAt: `2026-11-${String(10 + id).padStart(2, '0')} 10:00:00`,
    paymentStatus: 'paid',
    fulfillmentStatus: 'unfulfilled',
    rerouteConsent: 1,
    reservedByOther: false,
    ...extra,
  };
}

function input(candidates: EngineCandidateInput[], ret: Partial<EngineInput['ret']> = {}): EngineInput {
  return {
    ret: {
      returnId: 1,
      orderId: 1,
      condition: 'like_new',
      verificationStatus: 'verified',
      returnStatus: 'approved',
      product: { id: 1, sku: 'SKU-1', name: 'Headphones', priceCents: 9999, imageUrl: '' },
      returner,
      ...ret,
    },
    candidates,
    activeMatch: null,
  };
}

const NEAR = [53.3438, -6.2546] as const; // ~0.8 km
const MID = [53.3561, -6.2644] as const; // ~0.75 km other direction
const FAR = [53.5748, -6.2603] as const; // ~25 km
const EDGE = [53.3498, -6.042] as const; // ~14.5 km: within radius, unprofitable

describe('evaluateReturn', () => {
  it('ranks a nearby eligible buyer', () => {
    const r = evaluateReturn(input([buyer(2, ...NEAR)]));
    expect(r.state).toBe('matchable');
    expect(r.recommendation).toBe('reroute');
    expect(r.candidates[0]).toMatchObject({ eligible: true, rank: 1, rejections: [] });
    expect(r.candidates[0].costs.savingsCents).toBeGreaterThan(0);
  });

  it.each(['pending', 'failed'])('marks a %s return ineligible', (verificationStatus) => {
    const r = evaluateReturn(input([buyer(2, ...NEAR)], { verificationStatus }));
    expect(r).toMatchObject({ state: 'ineligible', recommendation: 'none', candidates: [] });
    expect(r.ineligibleReason).toBeTruthy();
  });

  it('marks damaged and terminal returns ineligible', () => {
    expect(evaluateReturn(input([buyer(2, ...NEAR)], { condition: 'damaged' })).state).toBe('ineligible');
    expect(evaluateReturn(input([buyer(2, ...NEAR)], { returnStatus: 'completed' })).state).toBe('ineligible');
  });

  it('collects every rejection reason that applies', () => {
    const r = evaluateReturn(
      input([
        buyer(3, ...FAR),
        buyer(4, ...NEAR, { rerouteConsent: 0 }),
        buyer(5, ...NEAR, { paymentStatus: 'pending' }),
        buyer(6, ...NEAR, { fulfillmentStatus: 'shipped' }),
        buyer(7, ...NEAR, { reservedByOther: true }),
        buyer(8, ...EDGE),
        { ...buyer(9, ...NEAR, { rerouteConsent: 0 }), buyer: { ...returner } },
      ]),
    );
    const by = Object.fromEntries(r.candidates.map((c) => [c.buyerOrderId, c.rejections]));
    expect(by[3]).toEqual(expect.arrayContaining(['too_far', 'unprofitable']));
    expect(by[4]).toEqual(['no_consent']);
    expect(by[5]).toEqual(['not_paid']);
    expect(by[6]).toEqual(['already_fulfilled']);
    expect(by[7]).toEqual(['reserved']);
    expect(by[8]).toEqual(['unprofitable']);
    expect(by[9]).toEqual(expect.arrayContaining(['same_customer', 'no_consent']));
    expect(r.state).toBe('no_match');
    expect(r.recommendation).toBe('warehouse');
    expect(r.candidates.every((c) => c.rank === null)).toBe(true);
  });

  it('ranks by savings, then distance, then oldest order; rejected listed last', () => {
    const r = evaluateReturn(
      input([buyer(5, ...FAR), buyer(4, ...MID), buyer(3, ...NEAR), buyer(2, ...NEAR)]),
    );
    const ids = r.candidates.map((c) => [c.buyerOrderId, c.rank]);
    const eligible = r.candidates.filter((c) => c.eligible);
    for (let i = 1; i < eligible.length; i++) {
      expect(eligible[i - 1].costs.savingsCents).toBeGreaterThanOrEqual(eligible[i].costs.savingsCents);
    }
    // Orders 2 and 3 are identical in position: older order (2) wins the tie.
    expect(ids.findIndex(([id]) => id === 2)).toBeLessThan(ids.findIndex(([id]) => id === 3));
    expect(ids.at(-1)).toEqual([5, null]);
  });

  it('a proposed match does not block, an accepted one reserves', () => {
    const proposed = { ...input([buyer(2, ...NEAR)]), activeMatch: { id: 1, buyerOrderId: 2, status: 'proposed' as const, savingsCents: 1 } };
    expect(evaluateReturn(proposed).state).toBe('matchable');
    const accepted = { ...proposed, activeMatch: { ...proposed.activeMatch, status: 'accepted' as const } };
    expect(evaluateReturn(accepted).state).toBe('reserved');
  });

  it('a reserved return does not list its own reserved buyer as rejected', () => {
    const reservedBuyer = buyer(2, ...NEAR, { fulfillmentStatus: 'processing' });
    const result = evaluateReturn({
      ...input([reservedBuyer, buyer(3, ...NEAR)]),
      activeMatch: { id: 1, buyerOrderId: 2, status: 'accepted', savingsCents: 1 },
    });
    expect(result.state).toBe('reserved');
    expect(result.candidates.map((c) => c.buyerOrderId)).toEqual([3]);
  });
});
