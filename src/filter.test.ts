import { Expect, Test, TestCase, TestFixture } from 'alsatian'
import filter from './filter'
import { Choice } from './interfaces'

function makeChoices(...values: string[]) {
  return values.map(makeChoice)
}

function makeChoice(value: string) {
  return { value }
}

@TestFixture('filter')
export class FilterTest {
  @TestCase(
    'deploy',
    makeChoices('yarn workspace @monor/api deploy', 'yarn tsc'),
    makeChoices('yarn workspace @monor/api deploy'),
  )
  @TestCase(
    'api deploy',
    makeChoices('yarn workspace @monor/api deploy', 'yarn tsc'),
    makeChoices('yarn workspace @monor/api deploy'),
  )
  @Test('filter')
  async test(input: string, choices: Choice[], expectedChoices: Choice[]) {
    Expect(await filter(input, choices)).toEqual(expectedChoices)
  }
}
