/**
 * Wallet split-payment check — the pure money-routing rule behind partial
 * wallet checkout and split refunds.
 *
 *   splitWalletGateway(amount, walletAmount)
 *     wallet-side  = min(amount, walletAmount)   (never negative)
 *     gateway-side = amount - wallet-side        (2dp, no float dust)
 *
 * Run from the backend root: npx tsx scripts/check-wallet-split.ts
 */
import assert from 'node:assert/strict';
import { roundMoney, splitWalletGateway } from '../src/utils/financial';

const s = splitWalletGateway;

// Pure gateway order (nothing came from the wallet) → all to the bank.
assert.deepEqual(s(500, 0), { walletPart: 0, gatewayPart: 500 });

// Pure wallet order (walletAmount === total) → all back to the wallet.
assert.deepEqual(s(500, 500), { walletPart: 500, gatewayPart: 0 });

// Split order → wallet share to wallet, remainder to the bank.
assert.deepEqual(s(500, 200), { walletPart: 200, gatewayPart: 300 });

// Refund amount smaller than what the wallet paid → wallet absorbs it all.
assert.deepEqual(s(150, 400), { walletPart: 150, gatewayPart: 0 });

// Partial admin refund larger than the wallet share → excess to the bank.
assert.deepEqual(s(400, 150), { walletPart: 150, gatewayPart: 250 });

// walletAmount above the amount (legacy/odd rows) → clamped, never negative.
assert.deepEqual(s(100, 999.99), { walletPart: 100, gatewayPart: 0 });

// Zero and float-dust cases stay exact at 2 decimals.
assert.deepEqual(s(0, 100), { walletPart: 0, gatewayPart: 0 });
assert.deepEqual(s(33.33, 33.33), { walletPart: 33.33, gatewayPart: 0 });
const dusty = s(0.1 + 0.2, 0.1 + 0.2); // 0.30000000000000004 territory
assert.equal(dusty.walletPart, 0.3);
assert.equal(dusty.gatewayPart, 0);

// Invariant across a sweep: parts are non-negative and always recompose.
for (let total = 1; total <= 1000; total += 37.19) {
  for (let wallet = 0; wallet <= total + 50; wallet += 41.07) {
    const { walletPart, gatewayPart } = s(total, wallet);
    assert.ok(walletPart >= 0 && gatewayPart >= 0, `negative part for ${total}/${wallet}`);
    assert.equal(roundMoney(walletPart + gatewayPart), roundMoney(total), `parts must recompose for ${total}/${wallet}`);
    assert.ok(walletPart <= roundMoney(total), `wallet cap breached for ${total}/${wallet}`);
  }
}

// Checkout-time split used by orders.service: wallet takes what its balance
// covers, gateway charges the remainder.
const balanceCovers = (balance: number, total: number) => {
  const walletContribution = Math.min(balance, total);
  return { walletContribution, gatewayDue: roundMoney(total - walletContribution) };
};
assert.deepEqual(balanceCovers(800, 500), { walletContribution: 500, gatewayDue: 0 }); // settled by wallet
assert.deepEqual(balanceCovers(200, 500), { walletContribution: 200, gatewayDue: 300 }); // split
assert.deepEqual(balanceCovers(0, 500), { walletContribution: 0, gatewayDue: 500 }); // gateway only

console.log('check-wallet-split: all assertions passed');
