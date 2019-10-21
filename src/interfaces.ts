export interface Choice {
  title: string
  description: string
  value: string
}

export interface PackageJson {
  name?: string
  workspaces?: {
    packages: string[]
  }
}
