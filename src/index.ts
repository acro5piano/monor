import Bluebird from 'bluebird'
import { spawn } from 'child_process'
import glob from 'glob'
import util from 'util'
import { Choice, PackageJson } from './interfaces'
import { flatten, padSpace, readJSON } from './util'

// TODO: some type defs not works
const { prompt } = require('enquirer')

const globPromise = util.promisify(glob)

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
