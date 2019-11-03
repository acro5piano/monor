import chalk from 'chalk'
import Fuse from 'fuse.js'
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
  selectedChoiceIndexes: [] as number[],
}

type State = typeof INITIAL_STATE

export const filterChoices = createSelector(
  (state: State) => state.input,
  (state: State) => state.choices,
  (input, choices) => {
    if (input.length === 0) {
      return choices
    }
    const options = {
      shouldSort: true,
      threshold: 0.5,
      location: 0,
      distance: 100,
      maxPatternLength: 32,
      minMatchCharLength: 0,
      includeScore: true,
    }
    const fuse = new Fuse(choices, options)
    const indexes: Array<{ item: number; score: number }> = fuse.search(input) as any
    return indexes.sort((x, y) => x.score - y.score).map(index => choices[index.item])
  },
)

export const getSelectedChoices = createSelector(
  (state: State) => state.choices,
  (state: State) => state.selectedChoiceIndexes,
  (state: State) => state.arrowIndex,
  filterChoices,
  (choices, indexes) => {
    return indexes.map(index => choices[index])
  },
)

export const getSelectedChoicesOrCurrentArrowItem = createSelector(
  getSelectedChoices,
  filterChoices,
  (state: State) => state.arrowIndex,
  (selectedChoices, filteredChoices, arrowIndex) => {
    if (selectedChoices.length === 0) {
      return [filteredChoices[arrowIndex]]
    }
    return selectedChoices
  },
)

export const actions = {
  input: actionCreator<string>('INPUT'),
  setChoices: actionCreator<string[]>('CHOICES'),
  toggleSelected: actionCreator('TOGGLE_SELECTED'),
  backspace: actionCreator('BACKSPACE'),
  del: actionCreator('DEL'),
  backward: actionCreator('BACKWARD'),
  forward: actionCreator('FORWARD'),
  killLine: actionCreator('KILL_LINE'),
  toCursorStart: actionCreator('TO_CURSOR_START'),
  toCursorEnd: actionCreator('TO_CURSOR_END'),
  up: actionCreator('UP'),
  down: actionCreator('DOWN'),
}

const reducer = reducerWithInitialState(INITIAL_STATE)
  .case(actions.toggleSelected, state => {
    const targetChoice = filterChoices(state)[state.arrowIndex]
    const targetIndex = state.choices.findIndex(choice => choice === targetChoice)
    return {
      ...state,
      selectedChoiceIndexes: state.selectedChoiceIndexes.includes(targetIndex)
        ? state.selectedChoiceIndexes.filter(index => index !== targetIndex)
        : [...state.selectedChoiceIndexes, targetIndex],
    }
  })
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
  .case(actions.killLine, state => ({
    ...state,
    input: state.input.slice(0, state.cursorPosition),
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
    arrowIndex: Math.min(filterChoices(state).length - 1, state.arrowIndex + 1),
  }))

export const storeFactory = () => createStore(reducer)

interface PromptProps {
  message: string
  body: string
  choices: string[]
}

interface KeyInfo {
  sequence: string
  name: string
  ctrl: boolean
}

async function prompt({ choices, body, message }: PromptProps): Promise<string[]> {
  process.stdin.setRawMode(true)
  readline.emitKeypressEvents(process.stdin)
  process.stdin.setEncoding('utf8')

  // initial rendering
  console.clear()
  console.log(chalk.bold(message))
  console.log(chalk.grey(body))

  const store = storeFactory()

  store.dispatch(actions.setChoices(choices))

  const storeDidUpdate = () => {
    const state = store.getState()
    const height = process.stdout.getWindowSize()[1]
    const { input, cursorPosition, arrowIndex } = state
    Array(choices.length + 10)
      .fill(0)
      .map((_, i) => {
        readline.cursorTo(process.stdout, 0, i + 3)
        process.stdout.write('\u001b[2K')
      })
    readline.cursorTo(process.stdout, 0, 2)
    process.stdout.write('> ')
    readline.cursorTo(process.stdout, 2, 2)
    process.stdout.write('\u001b[K')
    process.stdout.write(`${input}\n`)
    readline.cursorTo(process.stdout, 0, 4)
    filterChoices(state).forEach((choice, index) => {
      if (index + 4 > height) {
        return
      }
      const selected = getSelectedChoices(state).includes(choice)
      const anchor = selected ? '* ' : '  '
      if (index === arrowIndex) {
        process.stdout.write(chalk.whiteBright(`${anchor}${choice}\n`))
      } else if (selected) {
        process.stdout.write(chalk.dim(`${anchor}${choice}\n`))
      } else {
        process.stdout.write(chalk.dim(`${anchor}${choice}\n`))
      }
    })
    readline.cursorTo(process.stdout, cursorPosition + 2, 2)
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
          case 'k':
            return store.dispatch(actions.killLine())
          case 'n':
            return store.dispatch(actions.down())
          case 'p':
            return store.dispatch(actions.up())
          default:
            return
        }
      }
      switch (key.name) {
        case 'left':
          return store.dispatch(actions.backward())
        case 'right':
          return store.dispatch(actions.forward())
        case 'up':
          return store.dispatch(actions.up())
        case 'down':
          return store.dispatch(actions.down())
        case 'space':
          return store.dispatch(actions.toggleSelected())
        case 'backspace':
          return store.dispatch(actions.backspace())
        case 'return':
          process.stdin.setRawMode(false)
          console.clear()
          return resolve(getSelectedChoicesOrCurrentArrowItem(store.getState()))
        default:
          return store.dispatch(actions.input(key.name || key.sequence))
      }
    })
  })
}

export default prompt
