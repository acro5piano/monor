import { Choice } from './interfaces'

export default function filter(input: string, choices: Choice[]) {
  const words = input.split(' ')
  const filtered = choices.filter(choice => words.every(word => choice.value.includes(word)))
  return Promise.resolve(filtered)
}
