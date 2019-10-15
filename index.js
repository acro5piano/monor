#!/usr/bin/env node

const fs = require('fs')
const { exec } = require('child_process')
const util = require('util')
const glob = require('glob')
const Promise = require('bluebird')
const prompts = require('prompts')

const readFilePromise = util.promisify(fs.readFile)
const accessPromise = util.promisify(fs.access)
const globPromise = util.promisify(glob)

function flatten(arr) {
  return arr.reduce((car, cur) => [...car, ...cur], [])
}

async function readJSON(jsonPath) {
  return JSON.parse(await readFilePromise(`${process.cwd()}/${jsonPath}`, 'utf8'))
}

function padSpace(value, width = 20) {
  return value + ' '.repeat(width - value.length)
}

const suggestByTitle = (input, choices) => {
  return Promise.resolve(choices.filter(i => i.title.includes(input)))
}

async function main() {
  const { workspaces } = await readJSON('package.json')
  const dirs = await Promise.map(workspaces.packages, workspace => {
    return globPromise(workspace)
  })

  const choices = await Promise.reduce(
    flatten(dirs),
    async (car, dir) => {
      const path = `${dir}/package.json`
      try {
        const json = await readJSON(path)
        const choices = Object.keys(json.scripts).map(key => {
          return {
            title: `${padSpace(json.name)} - ${key} (${json.scripts[key]})`,
            value: `yarn workspace ${json.name} ${key}`,
          }
        })
        return [...car, ...choices]
      } catch {
        return car
      }
    },
    [],
  )
  const { answer } = await prompts({
    type: 'autocomplete',
    name: 'answer',
    message: `Which commands do you want to run? (Type to filter)`,
    choices,
    suggest: suggestByTitle,
  })
  exec(answer, (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`)
      return
    }
    console.log(stdout)
    console.log(stderr)
  })
}

main()
