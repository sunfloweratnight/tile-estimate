import type { EstimateInput, EstimateResult } from '../model/types'
import type { WorkerRequest, WorkerResponse } from './estimateWorker'

type Pending = {
  resolve: (r: EstimateResult) => void
  reject: (e: Error) => void
}

let worker: Worker | null = null
let nextId = 1
const pending = new Map<number, Pending>()

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./estimateWorker.ts', import.meta.url), {
      type: 'module',
    })
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const { id, result, error } = event.data
      const p = pending.get(id)
      if (!p) return
      pending.delete(id)
      if (error || !result) {
        p.reject(new Error(error ?? 'Empty worker result'))
      } else {
        p.resolve(result)
      }
    }
    worker.onerror = (e) => {
      for (const [, p] of pending) {
        p.reject(new Error(e.message || 'Worker error'))
      }
      pending.clear()
    }
  }
  return worker
}

export function estimateInWorker(input: EstimateInput): Promise<EstimateResult> {
  const id = nextId++
  const w = getWorker()
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    const msg: WorkerRequest = { id, input }
    w.postMessage(msg)
  })
}

export function terminateEstimateWorker(): void {
  if (worker) {
    worker.terminate()
    worker = null
  }
  pending.clear()
}
