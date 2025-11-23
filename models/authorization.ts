import { User } from './user'
import { Feature, features } from './features'

type CanParams = {
  user: User
  feature: Feature
}

function can({ user, feature }: CanParams): boolean {
  const featuresUserHas = user.features || []
  const userFeatures = featuresUserHas
    .map((s) => s.trim())
    .filter(features.isFeatureString)

  return userFeatures.includes(feature)
}

export const authorization = {
  can,
}
