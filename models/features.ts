export enum Feature {
  CREATE_SESSION = 'create:session',
  READ_ACTIVATION_TOKEN = 'read:activation_token',
  CREATE_USER = 'create:user',
  READ_USER = 'read:user',
  READ_SESSION = 'read:session',
  UPDATE_USER = 'update:user',
  UPDATE_USER_OTHERS = 'update:user:others',
  RUN_MIGRATIONS = 'run:migrations',
  GET_PENDING_MIGRATIONS = 'get:pending_migrations',
}

const VALID_FEATURES = new Set<string>(Object.values(Feature))

function isFeatureString(s: string): s is Feature {
  return VALID_FEATURES.has(s)
}

export const features = {
  isFeatureString,
}
