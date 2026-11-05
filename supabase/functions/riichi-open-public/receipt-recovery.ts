export type ReceiptRecoveryAction = 'return-committed' | 'preserve-uncertain' | 'discard-unreferenced'

export function receiptRecoveryAction(
  finalPath: string,
  committedReceiptPath: string | null | undefined,
  lookupFailed: boolean,
): ReceiptRecoveryAction {
  if (lookupFailed || !committedReceiptPath) return 'preserve-uncertain'
  return committedReceiptPath === finalPath ? 'return-committed' : 'discard-unreferenced'
}
