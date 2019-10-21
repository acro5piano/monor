import fs from 'fs'
import { spawn } from 'child_process'
import util from 'util'
import glob from 'glob'
import Bluebird from 'bluebird'

// TODO: some type defs not works
const { prompt } = require('enquirer')

const readFilePromise = util.promisify(fs.readFile)
const globPromise = util.promisify(glob)

interface Choice {
  title: string
  description: string
  value: string
}

interface PackageJson {
  name?: string
  workspaces?: {
    packages: string[]
  }
}

function flatten<T>(arr: T[][]) {
  return arr.reduce((car, cur) => [...car, ...cur], [] as T[])
}

async function readJSON(jsonPath: string) {
  return JSON.parse(await readFilePromise(`${process.cwd()}/${jsonPath}`, 'utf8'))
}

function padSpace(value: string, width = 20) {
  return value + ' '.repeat(width - value.length)
}

function suggestByTitle(input: string, choices: Choice[]) {
  return Bluebird.resolve(choices.filter(i => i.title.includes(input)))
}

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
          const description = `${json.scripts[key]}`
          if (!json.name || path === './package.json') {
            return {
              title: `${padSpace('__root__')} ${key}`,
              description,
              value: `yarn ${key}`,
            }
          }
          return {
            title: `${padSpace(json.name)} ${key}`,
            description,
            value: `yarn workspace ${json.name} ${key}`,
          }
        })
        return [...car, ...choices]
      } catch (e) {
        return car
      }
    },
    [] as Choice[],
  )
  const res = await prompt({
    type: 'autocomplete',
    name: 'answer',
    message: `Which commands do you want to run? (Type to filter)`,
    choices,
    suggest: suggestByTitle,
  }).catch((_e: any) => {
    return
  })
  if (!res || !res.answer) {
    return
  }

  const [command, ...args] = res.answer.split(' ')
  const ps = spawn(command, args)

  ps.stdout.on('data', data => {
    console.log(String(data).trim())
  })
  ps.stderr.on('data', data => {
    console.log(String(data).trim())
  })
}

module.exports.run = run
