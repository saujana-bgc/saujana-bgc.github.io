import assert from 'node:assert/strict'
import test from 'node:test'
import { receiptRecoveryAction } from '../supabase/functions/riichi-open-public/receipt-recovery.ts'

test('a lost RPC response returns the registration that references the final receipt', () => {
  assert.equal(receiptRecoveryAction('event/hold/final-a', 'event/hold/final-a', false), 'return-committed')
})

test('a failed confirmation lookup preserves the receipt for later recovery', () => {
  assert.equal(receiptRecoveryAction('event/hold/final-a', undefined, true), 'preserve-uncertain')
})

test('an empty confirmation lookup preserves the receipt while a commit may still be settling', () => {
  assert.equal(receiptRecoveryAction('event/hold/final-a', null, false), 'preserve-uncertain')
})

test('a concurrent upload is discarded only when the committed row points to another receipt', () => {
  assert.equal(receiptRecoveryAction('event/hold/final-b', 'event/hold/final-a', false), 'discard-unreferenced')
})
