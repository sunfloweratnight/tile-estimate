import { estimateWall } from './estimate'
import type { EstimateResult } from '../model/types'

export type WorkerRequest = {
  id: number
  input: Parameters<typeof estimateWall>[0]
}

export type WorkerResponse = {
  id: number
  result?: EstimateResult
  error?: string
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { id, input } = event.data
  try {
    const result = estimateWall(input)
    self.postMessage({ id, result } satisfies WorkerResponse)
  } catch (err) {
    self.postMessage({
      id,
      error: err instanceof Error ? err.message : String(err),
    } satisfies WorkerResponse)
  }
}
