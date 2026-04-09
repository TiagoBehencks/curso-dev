import { describe, expect, test } from 'vitest'
import { RunMigration } from 'node-pg-migrate/dist/migration'
import { Feature } from 'models/features'
import { authorization } from 'models/authorization'
import { User } from 'models/user'

function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-id',
    username: 'testuser',
    email: 'test@test.com',
    password: 'hashedpassword',
    features: [],
    created_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-01'),
    ...overrides,
  }
}

describe('models/authorization.ts', () => {
  describe('.can()', () => {
    test('without `user` throws error', () => {
      expect(() => {
        authorization.can({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          user: undefined as any,
          feature: Feature.READ_USER,
        })
      }).toThrow(TypeError)
    })

    test('without `user.features`', () => {
      const user = createMockUser()

      expect(authorization.can({ user, feature: Feature.READ_USER })).toBe(
        false
      )
    })

    test('with empty `user.features`', () => {
      const user = createMockUser({ features: [] })

      expect(authorization.can({ user, feature: Feature.READ_USER })).toBe(
        false
      )
    })

    test('with unknown `feature`', () => {
      const user = createMockUser({ features: [] })

      expect(
        authorization.can({ user, feature: 'unknown:feature' as Feature })
      ).toBe(false)
    })

    test('with valid `user` and known `feature`', () => {
      const user = createMockUser({ features: [Feature.CREATE_USER] })

      expect(authorization.can({ user, feature: Feature.CREATE_USER })).toBe(
        true
      )
    })

    test('with whitespace in feature string', () => {
      const user = createMockUser({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        features: [' read:user '] as any,
      })

      expect(authorization.can({ user, feature: Feature.READ_USER })).toBe(true)
    })

    test('UPDATE_USER without resource', () => {
      const user = createMockUser({ features: [Feature.UPDATE_USER] })

      expect(authorization.can({ user, feature: Feature.UPDATE_USER })).toBe(
        true
      )
    })

    test('UPDATE_USER same user ID', () => {
      const user = createMockUser({
        id: 'user-1',
        features: [Feature.UPDATE_USER],
      })

      const resource = createMockUser({ id: 'user-1' })

      expect(
        authorization.can({ user, feature: Feature.UPDATE_USER, resource })
      ).toBe(true)
    })

    test('UPDATE_USER different user with UPDATE_USER_OTHERS permission', () => {
      const user = createMockUser({
        id: 'user-1',
        features: [Feature.UPDATE_USER, Feature.UPDATE_USER_OTHERS],
      })

      const resource = createMockUser({ id: 'user-2' })

      expect(
        authorization.can({ user, feature: Feature.UPDATE_USER, resource })
      ).toBe(true)
    })

    test('UPDATE_USER different user without UPDATE_USER_OTHERS permission', () => {
      const user = createMockUser({
        id: 'user-1',
        features: [Feature.UPDATE_USER],
      })

      const resource = createMockUser({ id: 'user-2' })

      expect(
        authorization.can({ user, feature: Feature.UPDATE_USER, resource })
      ).toBe(false)
    })
  })

  describe('.filterOutput()', () => {
    test('without `user` returns filtered output', () => {
      const resource = createMockUser()

      const result = authorization.filterOutput({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        user: undefined as any,
        feature: Feature.READ_USER,
        resource,
      })

      expect(result).toBeDefined()
    })

    test('without `user.features` returns output', () => {
      const user = createMockUser()
      const resource = createMockUser()

      const result = authorization.filterOutput({
        user,
        feature: Feature.READ_USER,
        resource,
      })

      expect(result).toBeDefined()
    })

    test('with unknown `feature`', () => {
      const user = createMockUser({ features: [] })
      const resource = createMockUser()

      expect(() => {
        authorization.filterOutput({
          user,
          feature: 'unknown:feature',
          resource,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)
      }).toThrow('No output strategy defined for feature: unknown:feature')
    })

    test('with valid `user`, known `feature` and `resource` (READ_USER)', () => {
      const user = createMockUser({ features: [Feature.READ_USER] })
      const resource = createMockUser({
        id: '1',
        username: 'resource',
        features: [Feature.READ_USER],
      })

      const result = authorization.filterOutput({
        user,
        feature: Feature.READ_USER,
        resource,
      })

      expect(result).toEqual({
        id: '1',
        username: 'resource',
        features: [Feature.READ_USER],
        created_at: resource.created_at,
        updated_at: resource.updated_at,
      })
    })

    test('UPDATE_USER self includes email', () => {
      const user = createMockUser({
        id: '1',
        features: [Feature.UPDATE_USER],
      })
      const resource = createMockUser({
        id: '1',
        username: 'self',
        email: 'self@self.com',
      })

      const result = authorization.filterOutput({
        user,
        feature: Feature.UPDATE_USER,
        resource,
      })

      expect(result).toHaveProperty('email', 'self@self.com')
    })

    test('UPDATE_USER others excludes email', () => {
      const user = createMockUser({
        id: '1',
        features: [Feature.UPDATE_USER],
      })
      const resource = createMockUser({
        id: '2',
        username: 'other',
        email: 'other@other.com',
      })

      const result = authorization.filterOutput({
        user,
        feature: Feature.UPDATE_USER,
        resource,
      })

      expect(result).not.toHaveProperty('email')
    })

    test('RUN_MIGRATIONS returns migration array with path, name, timestamp', () => {
      const user = createMockUser({ features: [Feature.RUN_MIGRATIONS] })
      const migrations: RunMigration[] = [
        {
          path: '/path/to/migration1',
          name: 'migration1',
          timestamp: 1704067200000,
        },
        {
          path: '/path/to/migration2',
          name: 'migration2',
          timestamp: 1704153600000,
        },
      ]

      const result = authorization.filterOutput({
        user,
        feature: Feature.RUN_MIGRATIONS,
        resource: migrations,
      })

      expect(result).toEqual([
        {
          path: '/path/to/migration1',
          name: 'migration1',
          timestamp: migrations[0].timestamp,
        },
        {
          path: '/path/to/migration2',
          name: 'migration2',
          timestamp: migrations[1].timestamp,
        },
      ])
    })
  })
})
