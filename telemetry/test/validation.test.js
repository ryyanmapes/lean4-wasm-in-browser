import assert from 'node:assert/strict'
import test from 'node:test'
import { validateBatch } from '../src/validation.js'

const base = {
  event_id: 'd707e185-136e-4f54-bca8-e1aaffbbe396',
  user_uuid: 'a4ac71f1-54c6-40df-89f7-b5062bf71d60',
  attempt_uuid: '505300ff-0847-48eb-994b-7e834f938c4e',
  event_type: 'proof_step',
  game_id: 'g/local/NNG4', world_id: 'Tutorial', level_id: 2,
  mode: 'classic', sequence: 1, elapsed_ms: 1234,
  ts: '2026-08-04T12:00:00.000Z', step_type: 'edit',
  from_line: 0, removed_lines: 0, command: 'rw [add_zero]',
}

test('accepts a compact classic edit', () => {
  const result = validateBatch({ events: [base] })
  assert.equal(result?.[0].command, 'rw [add_zero]')
})

test('rejects invalid origins of proof paths', () => {
  assert.equal(validateBatch({ events: [{ ...base, sequence: -1 }] }), null)
  assert.equal(validateBatch({ events: [{ ...base, game_id: '../../etc' }] }), null)
  assert.equal(validateBatch({ events: [{ ...base, from_line: null }] }), null)
})
