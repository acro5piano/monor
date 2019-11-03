import chalk from 'chalk'
import fs from 'fs'
import util from 'util'

const readFilePromise = util.promisify(fs.readFile)

export function flatten<T>(arr: T[][]) {
  return arr.reduce((car, cur) => [...car, ...cur], [] as T[])
}

export async function readJSON(jsonPath: string, cwd = process.cwd()) {
  return JSON.parse(await readFilePromise(`${cwd}/${jsonPath}`, 'utf8'))
}

export function padSpace(value: string, width = 20) {
  return value + ' '.repeat(width - value.length)
}

export function pickRandomChalkColor() {
  const dice = Math.random()
  if (dice < 0.2) {
    return chalk.blue
  } else if (dice < 0.4) {
    return chalk.yellow
  } else if (dice < 0.6) {
    return chalk.white
  } else if (dice < 0.8) {
    return chalk.magenta
  } else {
    return chalk.white
  }
}
