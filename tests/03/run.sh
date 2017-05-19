#!/usr/bin/env bash

dapp build
dapp deploy -c 'Ballot' --params '["Crook A","Crook B","Crook C"]'
dapp console -i './js/script.js' > 'run.log'
