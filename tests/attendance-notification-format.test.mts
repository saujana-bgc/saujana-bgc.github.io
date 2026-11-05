import assert from 'node:assert/strict'
import test from 'node:test'
import { equalSecret, makeMessage, splitMessage, type AttendanceNotificationJob } from '../supabase/functions/attendance-notifications/format.ts'

function job(operation: AttendanceNotificationJob['operation'], payload: AttendanceNotificationJob['payload']): AttendanceNotificationJob {
  return { id: 'job-1', operation, attendee_id: 1, event_id: 2, payload, attempts: 1, lease_token: 'lease-1' }
}

test('attendance messages preserve old wording, event date and details as plain text', () => {
  const message = makeMessage(job('INSERT', {
    name: 'Mika_[*]', event_name: 'Monthly Meetup', event_date: '2026-11-14', eta: '19:30:00',
    amount_spent: '12.50', bringing_games: 'Mahjong_[set]', notes: 'bring *tea*',
  }))
  assert.equal(message, '📅 Monthly Meetup · 14 November 2026\n🌿 Mika_[*] just joined!\n⏰ ETA: 19:30\n💵 Spent: RM 12.50\n🎲 Bringing: Mahjong_[set]\n📝 Notes: bring *tea*')
  assert.equal(message.includes('parse_mode'), false)
})

test('update and delete messages retain their event snapshot and wording', () => {
  const payload = { name: 'Ari', event_name: 'Gathering', event_date: '2026-02-03' }
  assert.match(makeMessage(job('UPDATE', payload)), /✏️ Ari updated their details$/)
  assert.match(makeMessage(job('DELETE', payload)), /🗑️ Ari left the list$/)
  assert.equal(makeMessage(job('DELETE', payload)).startsWith('📅 Gathering · 3 February 2026'), true)
})

test('long messages split without losing text and stay within Telegram limit', () => {
  const text = `📅 Meetup\n${'あ😀_[*]'.repeat(1000)}`
  const parts = splitMessage(text)
  assert.ok(parts.length > 1)
  assert.ok(parts.every(part => part.length <= 4096))
  assert.equal(parts.join(''), text)
})

test('shared secret comparison rejects mismatches and accepts exact values', () => {
  assert.equal(equalSecret('secret-value', 'secret-value'), true)
  assert.equal(equalSecret('secret-value', 'secret-valuE'), false)
  assert.equal(equalSecret('short', 'longer'), false)
})
