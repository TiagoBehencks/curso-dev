import { RunMigration } from 'node-pg-migrate/dist/migration'

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

    if (
      user.id === resource.id ||
      can({ user, feature: Feature.UPDATE_USER_OTHERS })
    ) {
      authorized = true
    }
  }

  return authorized
}

type UserPublicData = Pick<
  User,
  'id' | 'username' | 'features' | 'created_at' | 'updated_at'
>

type FormatUserOutputParams = {
  user?: User
  resource: User
}

type FormatMigrationsOutputParams = {
  user?: User
  resource: RunMigration[]
}

function formatUserOutput({
  resource,
}: FormatUserOutputParams): UserPublicData {
  return {
    id: resource.id,
    username: resource.username,
    features: resource.features,
    created_at: resource.created_at,
    updated_at: resource.updated_at,
  }
}

function formatUpdatedUserOutput({
  user,
  resource,
}: FormatUserOutputParams): UserPublicData {
  const updateYourself = user.id === resource.id

  return {
    id: resource.id,
    username: resource.username,
    features: resource.features,
    created_at: resource.created_at,
    updated_at: resource.updated_at,
    ...(updateYourself && { email: resource.email }),
  }
}

function formatMigrationsOutput({
  resource,
}: FormatMigrationsOutputParams): RunMigration[] {
  return resource.map((migration) => ({
    path: migration.path,
    name: migration.name,
    timestamp: migration.timestamp,
  }))
}

type OutputStrategyMap = {
  [Feature.READ_USER]: UserPublicData
  [Feature.CREATE_SESSION]: UserPublicData
  [Feature.READ_ACTIVATION_TOKEN]: UserPublicData
  [Feature.CREATE_USER]: UserPublicData
  [Feature.READ_SESSION]: UserPublicData
  [Feature.UPDATE_USER]: UserPublicData
  [Feature.UPDATE_USER_OTHERS]: UserPublicData
  [Feature.RUN_MIGRATIONS]: RunMigration[]
  [Feature.GET_PENDING_MIGRATIONS]: RunMigration[]
}

type OutputStrategyFunctions = {
  [Feature.READ_USER]: (params: FormatUserOutputParams) => UserPublicData
  [Feature.CREATE_SESSION]: (params: FormatUserOutputParams) => UserPublicData
  [Feature.READ_ACTIVATION_TOKEN]: (
    params: FormatUserOutputParams
  ) => UserPublicData
  [Feature.CREATE_USER]: (params: FormatUserOutputParams) => UserPublicData
  [Feature.READ_SESSION]: (params: FormatUserOutputParams) => UserPublicData
  [Feature.UPDATE_USER]: (params: FormatUserOutputParams) => UserPublicData
  [Feature.UPDATE_USER_OTHERS]: (
    params: FormatUserOutputParams
  ) => UserPublicData
  [Feature.RUN_MIGRATIONS]: (
    params: FormatMigrationsOutputParams
  ) => RunMigration[]
  [Feature.GET_PENDING_MIGRATIONS]: (
    params: FormatMigrationsOutputParams
  ) => RunMigration[]
}

const OUTPUT_STRATEGIES: OutputStrategyFunctions = {
  [Feature.READ_USER]: formatUserOutput,
  [Feature.CREATE_SESSION]: formatUserOutput,
  [Feature.READ_ACTIVATION_TOKEN]: formatUserOutput,
  [Feature.CREATE_USER]: formatUserOutput,
  [Feature.READ_SESSION]: formatUserOutput,
  [Feature.UPDATE_USER]: formatUpdatedUserOutput,
  [Feature.UPDATE_USER_OTHERS]: formatUserOutput,
  [Feature.RUN_MIGRATIONS]: formatMigrationsOutput,
  [Feature.GET_PENDING_MIGRATIONS]: formatMigrationsOutput,
}

type FilterOutputParams<F extends Feature = Feature> = F extends
  | Feature.RUN_MIGRATIONS
  | Feature.GET_PENDING_MIGRATIONS
  ? {
      user: User
      feature: F
      resource: RunMigration[]
    }
  : {
      user: User
      feature: F
      resource: User
    }

function filterOutput<F extends Feature>({
  user,
  feature,
  resource,
}: FilterOutputParams<F>): OutputStrategyMap[F] {
  const strategy = OUTPUT_STRATEGIES[feature]

  if (!strategy) {
    throw new Error(`No output strategy defined for feature: ${feature}`)
  }

  const params =
    feature === Feature.RUN_MIGRATIONS ||
    feature === Feature.GET_PENDING_MIGRATIONS
      ? { user, resource: resource as RunMigration[] }
      : { user, resource: resource as User }

  return (
    strategy as (
      params: FormatUserOutputParams | FormatMigrationsOutputParams
    ) => OutputStrategyMap[F]
  )(params)
}

export const authorization = {
  can,
  filterOutput,
}
