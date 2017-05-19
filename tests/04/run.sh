#!/usr/bin/env bash

script='new Promise((resolve, reject) => {
  timer.setTimeout(
    () => {
      console.log("Promise kept!")
      resolve()
    },
    15000
  )
})'

dapp console -d . -e "$script" > 'run.log'
