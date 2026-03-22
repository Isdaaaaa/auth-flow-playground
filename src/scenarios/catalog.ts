import type { ScenarioPreset } from './types'

const baseCookies = [
  {
    name: 'session_id',
    value: 'sess_7f31a2',
    httpOnly: true,
    secure: true,
    sameSite: 'Lax' as const,
    expiresAt: '2026-03-22T03:10:00.000Z',
  },
  {
    name: 'csrf_token',
    value: 'csrf_9912',
    httpOnly: false,
    secure: true,
    sameSite: 'Strict' as const,
    expiresAt: '2026-03-22T03:10:00.000Z',
  },
]

export const scenarioCatalog: ScenarioPreset[] = [
  {
    id: 'expired-refresh-token',
    title: 'Expired refresh token',
    summary: 'Access token expires, then refresh fails with invalid_grant due to expired refresh token.',
    severity: 'critical',
    tags: ['refresh', 'expiry', 'oauth2'],
    fixture: {
      user: { id: 'usr_1001', email: 'devon@example.com', displayName: 'Devon Reyes', roles: ['member'] },
      tokens: {
        accessToken: 'atk_expired_1001',
        refreshToken: 'rtk_expired_1001',
        issuedAt: '2026-03-22T01:00:00.000Z',
        expiresAt: '2026-03-22T01:05:00.000Z',
        rotation: 2,
        valid: false,
      },
      cookies: baseCookies,
      events: [
        { id: 'evt_001', at: '2026-03-22T01:00:00.000Z', step: 'login', type: 'token_issued', detail: 'Initial token pair issued.' },
        { id: 'evt_002', at: '2026-03-22T01:05:03.000Z', step: 'token_refresh', type: 'token_expired', detail: 'Access token expired.' },
        { id: 'evt_003', at: '2026-03-22T01:05:04.000Z', step: 'token_refresh', type: 'refresh_rejected', detail: 'Refresh token rejected with invalid_grant.' },
      ],
      apiErrors: {
        refresh: { code: 'invalid_grant', status: 401, message: 'Refresh token expired or revoked.' },
      },
      serverClockOffsetMs: 0,
      tabsActive: 1,
    },
  },
  {
    id: 'invalid-callback-state',
    title: 'Invalid callback state',
    summary: 'Authorization callback returns with mismatched state parameter.',
    severity: 'critical',
    tags: ['oauth2', 'callback', 'csrf'],
    fixture: {
      user: { id: 'usr_1002', email: 'riley@example.com', displayName: 'Riley Chen', roles: ['admin'] },
      tokens: {
        accessToken: 'atk_pending_1002',
        refreshToken: 'rtk_pending_1002',
        issuedAt: '2026-03-22T02:00:00.000Z',
        expiresAt: '2026-03-22T02:15:00.000Z',
        rotation: 0,
        valid: false,
      },
      cookies: baseCookies,
      events: [
        { id: 'evt_101', at: '2026-03-22T02:00:00.000Z', step: 'login', type: 'token_issued', detail: 'PKCE login started.' },
        { id: 'evt_102', at: '2026-03-22T02:00:01.000Z', step: 'callback', type: 'callback_failed', detail: 'state mismatch detected.' },
        { id: 'evt_103', at: '2026-03-22T02:00:01.100Z', step: 'session_invalidated', type: 'csrf_failed', detail: 'Session reset to prevent CSRF exploit.' },
      ],
      apiErrors: {
        callback: { code: 'invalid_state', status: 400, message: 'State parameter does not match initiating request.' },
      },
      serverClockOffsetMs: 0,
      tabsActive: 1,
    },
  },
  {
    id: 'clock-skew-drift',
    title: 'Clock skew drift',
    summary: 'Client clock is ahead; token appears not-yet-valid to server.',
    severity: 'warning',
    tags: ['clock-skew', 'jwt', 'validation'],
    fixture: {
      user: { id: 'usr_1003', email: 'sam@example.com', displayName: 'Sam Park', roles: ['member'] },
      tokens: {
        accessToken: 'atk_skew_1003',
        refreshToken: 'rtk_skew_1003',
        issuedAt: '2026-03-22T02:09:00.000Z',
        expiresAt: '2026-03-22T02:24:00.000Z',
        rotation: 1,
        valid: true,
      },
      cookies: baseCookies,
      events: [
        { id: 'evt_201', at: '2026-03-22T02:09:00.000Z', step: 'login', type: 'token_issued', detail: 'Token issued from auth server.' },
        { id: 'evt_202', at: '2026-03-22T02:09:03.000Z', step: 'api_request', type: 'clock_skew_detected', detail: 'Server indicates token used before nbf.' },
      ],
      apiErrors: {},
      serverClockOffsetMs: -90000,
      tabsActive: 1,
    },
  },
  {
    id: 'multi-tab-logout-cascade',
    title: 'Multi-tab logout cascade',
    summary: 'Logout in one tab broadcasts and clears session cookies in sibling tabs.',
    severity: 'normal',
    tags: ['logout', 'broadcast-channel', 'cookies'],
    fixture: {
      user: { id: 'usr_1004', email: 'jules@example.com', displayName: 'Jules Carter', roles: ['member'] },
      tokens: {
        accessToken: 'atk_logout_1004',
        refreshToken: 'rtk_logout_1004',
        issuedAt: '2026-03-22T00:40:00.000Z',
        expiresAt: '2026-03-22T00:55:00.000Z',
        rotation: 3,
        valid: false,
      },
      cookies: baseCookies,
      events: [
        { id: 'evt_301', at: '2026-03-22T00:53:21.000Z', step: 'logout', type: 'broadcast_logout', detail: 'Tab A sent logout broadcast.' },
        { id: 'evt_302', at: '2026-03-22T00:53:21.050Z', step: 'session_invalidated', type: 'cookie_cleared', detail: 'Tab B cleared session cookie.' },
      ],
      apiErrors: {
        session: { code: 'session_revoked', status: 401, message: 'Session no longer valid after broadcast logout.' },
      },
      serverClockOffsetMs: 0,
      tabsActive: 3,
    },
  },
  {
    id: 'stale-refresh-rotation-replay',
    title: 'Stale refresh rotation replay',
    summary: 'Old refresh token replayed after rotation counter increment.',
    severity: 'critical',
    tags: ['refresh', 'replay', 'rotation'],
    fixture: {
      user: { id: 'usr_1005', email: 'nora@example.com', displayName: 'Nora Silva', roles: ['member'] },
      tokens: {
        accessToken: 'atk_rotation_1005',
        refreshToken: 'rtk_rotation_stale_1005',
        issuedAt: '2026-03-22T01:18:00.000Z',
        expiresAt: '2026-03-22T01:33:00.000Z',
        rotation: 5,
        valid: false,
      },
      cookies: baseCookies,
      events: [
        { id: 'evt_401', at: '2026-03-22T01:25:00.000Z', step: 'token_refresh', type: 'refresh_succeeded', detail: 'Refresh completed and counter advanced to 5.' },
        { id: 'evt_402', at: '2026-03-22T01:25:03.000Z', step: 'token_refresh', type: 'refresh_rejected', detail: 'Stale token replay detected.' },
        { id: 'evt_403', at: '2026-03-22T01:25:03.200Z', step: 'session_invalidated', type: 'session_revoked', detail: 'Session revoked due to possible theft.' },
      ],
      apiErrors: {
        refresh: { code: 'token_replay_detected', status: 401, message: 'Refresh token replay detected.' },
      },
      serverClockOffsetMs: 0,
      tabsActive: 1,
    },
  },
  {
    id: 'server-side-session-revoked',
    title: 'Server-side session revoked',
    summary: 'Identity provider revokes active session while client still has local tokens.',
    severity: 'warning',
    tags: ['session', 'revocation', 'idp'],
    fixture: {
      user: { id: 'usr_1006', email: 'kai@example.com', displayName: 'Kai Morgan', roles: ['member'] },
      tokens: {
        accessToken: 'atk_revoked_1006',
        refreshToken: 'rtk_revoked_1006',
        issuedAt: '2026-03-22T02:30:00.000Z',
        expiresAt: '2026-03-22T02:45:00.000Z',
        rotation: 1,
        valid: false,
      },
      cookies: baseCookies,
      events: [
        { id: 'evt_501', at: '2026-03-22T02:36:00.000Z', step: 'api_request', type: 'session_revoked', detail: 'Resource server reports session was revoked by administrator.' },
        { id: 'evt_502', at: '2026-03-22T02:36:00.150Z', step: 'session_invalidated', type: 'cookie_cleared', detail: 'Client clears local cookies and prompts re-authentication.' },
      ],
      apiErrors: {
        session: { code: 'session_revoked', status: 401, message: 'Server-side session has been revoked.' },
      },
      serverClockOffsetMs: 0,
      tabsActive: 1,
    },
  },
]

export const defaultScenarioId = scenarioCatalog[0].id

export const getScenarioById = (id: string) =>
  scenarioCatalog.find((scenario) => scenario.id === id) ?? scenarioCatalog[0]
