export type ScenarioSeverity = 'normal' | 'warning' | 'critical'

export type AuthFlowStep =
  | 'boot'
  | 'login'
  | 'token_refresh'
  | 'callback'
  | 'api_request'
  | 'logout'
  | 'session_invalidated'

export type AuthEventType =
  | 'token_issued'
  | 'token_expired'
  | 'refresh_rejected'
  | 'refresh_succeeded'
  | 'callback_failed'
  | 'clock_skew_detected'
  | 'broadcast_logout'
  | 'cookie_cleared'
  | 'csrf_failed'
  | 'session_revoked'

export type FixtureUser = {
  id: string
  email: string
  displayName: string
  roles: string[]
}

export type TokenFixture = {
  accessToken: string
  refreshToken: string
  issuedAt: string
  expiresAt: string
  rotation: number
  valid: boolean
}

export type CookieFixture = {
  name: string
  value: string
  httpOnly: boolean
  secure: boolean
  sameSite: 'Lax' | 'Strict' | 'None'
  expiresAt: string
}

export type EventFixture = {
  id: string
  at: string
  step: AuthFlowStep
  type: AuthEventType
  detail: string
}

export type ApiErrorFixture = {
  code: string
  status: number
  message: string
}

export type ScenarioFixture = {
  user: FixtureUser
  tokens: TokenFixture
  cookies: CookieFixture[]
  events: EventFixture[]
  apiErrors: {
    refresh?: ApiErrorFixture
    callback?: ApiErrorFixture
    session?: ApiErrorFixture
  }
  serverClockOffsetMs: number
  tabsActive: number
}

export type ScenarioPreset = {
  id: string
  title: string
  summary: string
  severity: ScenarioSeverity
  tags: string[]
  fixture: ScenarioFixture
}

export type ApiLatencyProfile = 'none' | 'fast' | 'realistic'

export type MockApiOptions = {
  latency?: ApiLatencyProfile
}

export type ApiResult<T> = {
  ok: true
  data: T
}

export type ApiFailure = {
  ok: false
  error: ApiErrorFixture
}

export type ApiResponse<T> = ApiResult<T> | ApiFailure
