export enum Feature {
  CREATE_SESSION = 'create:session',
  READ_ACTIVATION_TOKEN = 'read:activation_token',
  CREATE_USER = 'create:user',
  READ_SESSION = 'read:session',
}

const VALID_FEATURES = new Set<string>(Object.values(Feature))

function isFeatureString(s: string): s is Feature {
  return VALID_FEATURES.has(s)
}

export const features = {
  isFeatureString,
}
