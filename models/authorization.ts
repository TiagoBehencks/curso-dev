import { Feature, features } from './features'

type CanParams = {
  featuresUserHas: Feature[]
  feature: Feature
}

async function can({ featuresUserHas, feature }: CanParams): Promise<boolean> {
  const userFeatures = featuresUserHas
    .map((s) => s.trim())
    .filter(features.isFeatureString)

  return userFeatures.includes(feature)
}

export const authorization = {
  can,
}
