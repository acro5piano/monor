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

  const commands = await prompt({
    message: 'Which commands do you want to run?',
    body: 'Type to filter, Press space to select, Return to run',
    choices: choices.sort(),
  })

  if (commands.length === 0) {
    return
  }

  const codes = await Bluebird.map(commands, command => {
    return new Promise<number>((resolve, reject) => {
      const [cmd, ...args] = command.split(' ')
      const ps = spawn(cmd, args)

      ps.stdout.on('data', data => {
        console.log(String(data).trim())
      })
      ps.stderr.on('data', data => {
        console.log(String(data).trim())
      })
      ps.on('exit', code => {
        if (code === null || code > 0) {
          reject(code)
        } else {
          resolve(code)
        }
      })
    })
  })

  process.exit(codes.every(c => c > 0) ? 1 : 0)
}

module.exports.run = run
