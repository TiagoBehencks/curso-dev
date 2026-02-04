import { User } from './user'
import { Feature, features } from './features'

type CanParams = {
  user: User
  feature: Feature
  resource?: User
}

function can({ user, feature, resource }: CanParams): boolean {
  const featuresUserHas = user.features || []
  const userFeatures = featuresUserHas
    .map((s) => s.trim())
    .filter(features.isFeatureString)

  let authorized = false

  if (userFeatures.includes(feature)) {
    authorized = true
  }

  if (feature === Feature.UPDATE_USER && resource) {
    authorized = false

    if (user.id === resource.id) {
      authorized = true
    }
  }

  return authorized
}

export const authorization = {
  can,
}
