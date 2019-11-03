export interface PackageJson {
  name?: string
  workspaces?: {
    packages: string[]
  }
}
