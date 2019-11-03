import chalk from 'chalk'
import readline from 'readline'
import { createStore } from 'redux'
import { createSelector } from 'reselect'
import actionCreatorFactory from 'typescript-fsa'
import { reducerWithInitialState } from 'typescript-fsa-reducers'

const actionCreator = actionCreatorFactory('prompt')

const INITIAL_STATE = {
  choices: [] as string[],
  input: '',
  cursorPosition: 0,
  arrowIndex: 0,
}

type State = typeof INITIAL_STATE

export const filterChoices = createSelector(
  (state: State) => state.input,
  (state: State) => state.choices,
  (input, choices) => {
    const words = input.split(' ')
    const filtered = choices.filter(choice => words.every(word => choice.includes(word)))
    return filtered
  },
)

export const actions = {
  input: actionCreator<string>('INPUT'),
  setChoices: actionCreator<string[]>('CHOICES'),
  backspace: actionCreator('BACKSPACE'),
  del: actionCreator('DEL'),
  backward: actionCreator('BACKWARD'),
  forward: actionCreator('FORWARD'),
  toCursorStart: actionCreator('TO_CURSOR_START'),
  toCursorEnd: actionCreator('TO_CURSOR_END'),
  up: actionCreator('UP'),
  down: actionCreator('DOWN'),
}

const reducer = reducerWithInitialState(INITIAL_STATE)
  .case(actions.setChoices, (state, choices) => ({
    ...state,
    choices,
  }))
  .case(actions.input, (state, newInput) => {
    const { input, cursorPosition, arrowIndex } = state
    return {
      ...state,
      input: `${input.slice(0, cursorPosition)}${newInput}${input.slice(cursorPosition, -1)}`,
      cursorPosition: state.cursorPosition + 1,
      arrowIndex: Math.min(filterChoices(state).length, arrowIndex),
    }
  })
  .case(actions.backspace, state => {
    const { input, cursorPosition } = state
    return {
      ...state,
      input: `${input.slice(0, cursorPosition - 1)}${input.slice(cursorPosition, input.length)}`,
      cursorPosition: Math.max(0, state.cursorPosition - 1),
    }
  })
  .case(actions.del, state => {
    const { input, cursorPosition } = state
    return {
      ...state,
      input: `${input.slice(0, cursorPosition)}${input.slice(cursorPosition + 1, input.length)}`,
    }
  })
  .case(actions.forward, state => ({
    ...state,
    cursorPosition: Math.min(state.input.length, state.cursorPosition + 1),
  }))
  .case(actions.backward, state => ({
    ...state,
    cursorPosition: Math.max(0, state.cursorPosition - 1),
  }))
  .case(actions.toCursorStart, state => ({
    ...state,
    cursorPosition: 0,
  }))
  .case(actions.toCursorEnd, state => ({
    ...state,
    cursorPosition: state.input.length,
  }))
  .case(actions.up, state => ({
    ...state,
    arrowIndex: Math.max(0, state.arrowIndex - 1),
  }))
  .case(actions.down, state => ({
    ...state,
    arrowIndex: Math.min(filterChoices(state).length, state.arrowIndex + 1),
  }))

export const storeFactory = () => createStore(reducer)

interface PromptProps {
  message: string
  choices: string[]
}

interface KeyInfo {
  sequence: string
  name: string
  ctrl: boolean
}

async function prompt({ choices, message }: PromptProps): Promise<string> {
  process.stdin.setRawMode(true)
  readline.emitKeypressEvents(process.stdin)
  process.stdin.setEncoding('utf8')

  const store = storeFactory()

  store.dispatch(actions.setChoices(choices))

  const storeDidUpdate = () => {
    const state = store.getState()
    const { input, cursorPosition, arrowIndex } = state
    console.clear()
    console.log(message)
    console.log(`> ${input}\n`)
    filterChoices(state).forEach((choice, index) => {
      if (index === arrowIndex) {
        console.log(chalk.whiteBright(`> ${choice}`))
      } else {
        console.log(chalk.dim(`  ${choice}`))
      }
    })
    readline.cursorTo(process.stdout, cursorPosition + 2, 1)
  }

  store.subscribe(storeDidUpdate)

  storeDidUpdate()

  return new Promise(resolve => {
    process.stdin.on('keypress', (_: any, key: KeyInfo) => {
      if (key.ctrl) {
        switch (key.name) {
          case 'a':
            return store.dispatch(actions.toCursorStart())
          case 'b':
            return store.dispatch(actions.backward())
          case 'c':
            console.clear()
            return process.exit(0)
          case 'd':
            return store.dispatch(actions.del())
          case 'e':
            return store.dispatch(actions.toCursorEnd())
          case 'f':
            return store.dispatch(actions.forward())
          case 'n':
            return store.dispatch(actions.down())
          case 'p':
            return store.dispatch(actions.up())
        }
      }
      switch (key.name) {
        case 'space':
          return store.dispatch(actions.input(' '))
        case 'backspace':
          return store.dispatch(actions.backspace())
        case 'return':
          process.stdin.setRawMode(false)
          return resolve('yarn workspace @example/app start')
        default:
          return store.dispatch(actions.input(key.name || key.sequence))
      }
    })
  })
}

export default prompt
