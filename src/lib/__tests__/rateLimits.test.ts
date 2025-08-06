import { RATE_LIMITS, getRateLimitForUser, getAnonymousRateLimitKey, getUserRateLimitKey } from '../rateLimits'

describe('Rate Limits Configuration', () => {
  describe('RATE_LIMITS constants', () => {
    it('should have proper structure for all plan types', () => {
      expect(RATE_LIMITS.ANONYMOUS).toBeDefined()
      expect(RATE_LIMITS.FREE).toBeDefined()
      expect(RATE_LIMITS.PRO).toBeDefined()
      expect(RATE_LIMITS.ENTERPRISE).toBeDefined()
    })

    it('should have increasing limits from FREE to PRO to ENTERPRISE', () => {
      expect(RATE_LIMITS.PRO.GET_LIBRARY.limit).toBeGreaterThan(RATE_LIMITS.FREE.GET_LIBRARY.limit)
      expect(RATE_LIMITS.ENTERPRISE.GET_LIBRARY.limit).toBeGreaterThan(RATE_LIMITS.PRO.GET_LIBRARY.limit)
    })

    it('should have proper external API quotas', () => {
      expect(RATE_LIMITS.EXTERNAL.OPENAI.TOKENS_PER_MINUTE).toBe(90000)
      expect(RATE_LIMITS.EXTERNAL.YOUTUBE.DAILY_QUOTA).toBe(10000)
      expect(RATE_LIMITS.EXTERNAL.STRIPE.REQUESTS_PER_SECOND).toBe(100)
    })
  })

  describe('getRateLimitForUser', () => {
    it('should return correct limits for FREE plan', () => {
      const limit = getRateLimitForUser('FREE', 'CREATE_SUMMARY')
      expect(limit).toEqual({ limit: 3, window: 'lifetime' })
    })

    it('should return correct limits for PRO plan', () => {
      const limit = getRateLimitForUser('PRO', 'CREATE_SUMMARY')
      expect(limit).toEqual({ limit: 25, window: 'month' })
    })

    it('should return unlimited for ENTERPRISE plan summary creation', () => {
      const limit = getRateLimitForUser('ENTERPRISE', 'CREATE_SUMMARY')
      expect(limit).toEqual({ limit: -1, window: 'unlimited' })
    })
  })

  describe('Rate limit key generators', () => {
    it('should generate anonymous rate limit keys correctly', () => {
      const key = getAnonymousRateLimitKey('fingerprint123', '192.168.1.1', 'create_summary')
      expect(key).toBe('rate_limit:anon:fingerprint123:192.168.1.1:create_summary')
    })

    it('should generate user rate limit keys correctly', () => {
      const key = getUserRateLimitKey('user123', 'get_library')
      expect(key).toBe('rate_limit:user:user123:get_library')
    })
  })
})