export interface Choice {
  value: string
  title?: string
}

export interface PackageJson {
  name?: string
  workspaces?: {
    packages: string[]
  }
}
