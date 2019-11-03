import Bluebird from 'bluebird'
import { spawn } from 'child_process'
import glob from 'glob'
import util from 'util'
import { PackageJson } from './interfaces'
import prompt from './prompt'
import { flatten, readJSON } from './util'

const globPromise = util.promisify(glob)

async function run() {
  const packageJson: PackageJson = await readJSON('package.json')
  const dirs = await Bluebird.map(
    ['.', ...((packageJson.workspaces && packageJson.workspaces.packages) || [])],
    workspace => {
      return globPromise(workspace)
    },
  )

  const choices = await Bluebird.reduce(
    flatten(dirs),
    async (car, dir) => {
      const path = `${dir}/package.json`
      try {
        const json = await readJSON(path)
        const choices = Object.keys(json.scripts).map(key => {
          if (!json.name || path === './package.json') {
            return `yarn ${key}`
          }
          return `yarn workspace ${json.name} ${key}`
        })
        return [...car, ...choices]
      } catch (e) {
        return car
      }
    },
    [] as string[],
  )

  const res = await prompt({
    message: `Which commands do you want to run? (Type to filter)`,
    choices: choices.sort(),
  })

  if (res.length === 0) {
    return
  }

  const [command, ...args] = res.split(' ')
  const ps = spawn(command, args)

  ps.stdout.on('data', data => {
    console.log(String(data).trim())
  })
  ps.stderr.on('data', data => {
    console.log(String(data).trim())
  })
  ps.on('exit', code => {
    process.exit(code || 0)
  })
}

module.exports.run = run
