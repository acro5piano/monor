import Bluebird from 'bluebird'
import chalk from 'chalk'
import { spawn } from 'child_process'
import glob from 'glob'
import util from 'util'
import { PackageJson } from './interfaces'
import prompt from './prompt'
import { flatten, padSpace, pickRandomChalkColor, readJSON } from './util'

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

  console.log(chalk.bold('Running commands concurrently'))

  commands.forEach(command => {
    console.log(chalk.gray(`$ ${command}`))
  })

  const codes = await Bluebird.map(commands, command => {
    return new Promise<number>((resolve, reject) => {
      const [cmd, ...args] = command.split(' ')
      const ps = spawn(cmd, args)
      const colorlize = pickRandomChalkColor()
      const print = (data: any) => {
        const prefix = command.replace(/yarn (workspace )?/, '').slice(0, 15)
        console.log(colorlize(`${padSpace(prefix, 15)} | ${String(data).trim()}`))
      }
      ps.stdout.on('data', print)
      ps.stderr.on('data', print)
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
