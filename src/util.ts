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
  const r = (Math.random() * 100000) / 255
  const g = (Math.random() * 100000) / 255
  const b = (Math.random() * 100000) / 255
  return chalk.rgb(r, g, b)
}
