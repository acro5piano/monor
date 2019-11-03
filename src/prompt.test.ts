import { Expect, Setup, Test, TestCase, TestFixture } from 'alsatian'
import { actions, filterChoices, getSelectedChoices, storeFactory } from './prompt'

@TestFixture('prompt')
export class PromptTest {
  store!: ReturnType<typeof storeFactory>

  @Setup
  setup() {
    this.store = storeFactory()
  }

  @Test()
  async cursor() {
    'abcdef'.split('').forEach(c => this.store.dispatch(actions.input(c)))
    Expect(this.store.getState().cursorPosition).toEqual(6)
    Expect(this.store.getState().input).toEqual('abcdef')

    this.store.dispatch(actions.backward())
    this.store.dispatch(actions.backward())
    Expect(this.store.getState().cursorPosition).toEqual(4)

    this.store.dispatch(actions.backspace())
    Expect(this.store.getState().cursorPosition).toEqual(3)
    Expect(this.store.getState().input).toEqual('abcef')

    this.store.dispatch(actions.del())
    Expect(this.store.getState().cursorPosition).toEqual(3)
    Expect(this.store.getState().input).toEqual('abcf')

    this.store.dispatch(actions.forward())
    this.store.dispatch(actions.forward())
    this.store.dispatch(actions.forward())
    Expect(this.store.getState().cursorPosition).toEqual(4)
  }

  @Test()
  async getSelectedChoices() {
    this.store.dispatch(actions.setChoices(['a', 'b', 'c']))
    this.store.dispatch(actions.input('b'))
    this.store.dispatch(actions.toggleSelected())
    Expect(getSelectedChoices(this.store.getState())).toEqual(['b'])
  }

  @Test()
  async selectOne() {
    this.store.dispatch(actions.setChoices(['a', 'b', 'c']))
    this.store.dispatch(actions.input('b'))
    Expect(getSelectedChoices(this.store.getState())).toEqual(['b'])
  }

  @TestCase(
    'deploy',
    ['yarn workspace @monor/api deploy', 'yarn tsc'],
    ['yarn workspace @monor/api deploy'],
  )
  @TestCase(
    'api deploy',
    ['yarn workspace @monor/api deploy', 'yarn tsc'],
    ['yarn workspace @monor/api deploy'],
  )
  @Test()
  async filter(input: string, choices: string[], expectedChoices: string[]) {
    this.store.dispatch(actions.input(input))
    this.store.dispatch(actions.setChoices(choices))
    Expect(await filterChoices(this.store.getState())).toEqual(expectedChoices)
  }
}
