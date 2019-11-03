[![CircleCI](https://circleci.com/gh/acro5piano/monor.svg?style=svg)](https://circleci.com/gh/acro5piano/monor)
[![npm version](https://badge.fury.io/js/monor.svg)](https://badge.fury.io/js/monor)

# monor

List commands of each yarn workspaces

![image](https://raw.githubusercontent.com/acro5piano/monor/master/demo-96c1d58d40ca44a1fe157b0bd0295b43.gif)

# Why

Every time I run yarn workspaces commands, I have to type `yarn workspace @myapp/package start`, which is a kind of hard work.

With `monor`, you can select your workspaces command interactively.

# Getting started

Install it globally:

```
npm -g install monor
```

Then just run `monor` to list all of your commands under your workspaces:

```
monor
```

# Features

- Read all `scripts` package.json under yarn workspaces' packages
- List and execute commands interactively
- Run multiple commands concurrently

# Development Status

Still in Beta. If you have any suggestions or feature requests, feel free to open new issues or Pull Requests!

Please run the following commands after you clone it:

```
yarn install
yarn example
yarn test:unit
yarn test:e2e
```
