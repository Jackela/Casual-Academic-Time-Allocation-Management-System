import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CatamsAPIClient, type ApiError } from '../../api/ApiClient'
import { API_CONFIG } from '../../config/api.config'

describe('CatamsAPIClient base URL & error propagation (red)', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('should use E2E_URL when NODE_ENV=test', () => {
    const client = new CatamsAPIClient()
    const base = (client as any).apiClient.defaults.baseURL
    // This will fail if getApiBaseUrl does not resolve to E2E URL in test
    expect(base).toBe(API_CONFIG.BACKEND.E2E_URL)
  })

  it('should propagate API error message', async () => {
    const client = new CatamsAPIClient('http://localhost:9') // invalid port to force error
    await expect(client.getHealthStatus()).rejects.toBeDefined()
  })
})