#! /usr/bin/env node

const yargs = require('yargs')
const vm = require('vm')
const repl = require('repl')
const fs = require('fs')
const Web3 = require('web3')
const timer = require('timers')

const argv = yargs
    .usage(`
Command-line REPL javascript console.
'Web3.js' provides access to an Ethereum blockchain.
Compiled contracts are represented as objects.
Each deployed contract (with available 'dapp-deploy' metadata)
is associated with its on-chain address.

Usage: $0 [options]
`)
    .option('h', {
      alias: 'host',
      describe: 'Ethereum JSON-RPC server hostname',
      string: true,
      nargs: 1,
      default: 'localhost'
    })
    .option('p', {
      alias: 'port',
      describe: 'Ethereum JSON-RPC server port number',
      number: true,
      nargs: 1,
      default: 8545
    })
    .option('tls', {
      alias: ['https', 'ssl'],
      describe: 'Require TLS handshake (https:) to connect to Ethereum JSON-RPC server',
      boolean: true,
      default: false
    })
    .option('d', {
      alias: 'contracts_directory',
      describe: 'Path to directory containing all contract artifacts: (.abi, .deployed)' + "\n" + 'note: The default path assumes that the current directory is the root of a compiled "dapp" project.',
      string: true,
      nargs: 1,
      default: './out'
    })
    .option('i', {
      alias: 'input_file',
      describe: 'Path to javascipt file to execute, then quit.',
      string: true,
      nargs: 1
    })
    .option('e', {
      alias: 'execute',
      describe: 'Inline javascript to execute, then quit',
      string: true,
      nargs: 1
    })
    .example('$0', 'connect to: "http://localhost:8545"')
    .example('$0 -h "mainnet.infura.io" -p 443 --ssl', 'connect to: "https://mainnet.infura.io:443"')
    .example('$0 -d "/path/to/compiled/contracts"', 'load contracts into REPL console')
    .example('$0 -i "/path/to/script.js"', 'execute a script file')
    .example('$0 -e \'console.log("unlocked accounts:", "\\n", web3.eth.accounts)\'', 'execute an inline script')
    .help('help')
    .wrap(yargs.terminalWidth())
    .epilog("copyright: Warren Bank <github.com/warren-bank>\nlicense: GPLv2")
    .argv

const https = argv.tls
const host = argv.h
const port = argv.p

const contracts_directory = argv.d
const input_file = argv.i
const inline_script = argv.e

const die = function(msg){
  console.log(msg)
  console.log("\n")
  process.exit(1)
}

var regex

const ls = function(path, file_ext){
  var files
  file_ext = file_ext.replace(/^\.*(.*)$/, '$1')
  regex = new RegExp('\.' + file_ext + '$')
  files = fs.readdirSync(path)
  files = files.filter((file) => {
    return file.match(regex)
  })
  return files
}

var fname_abis, fname_deployments
try {
  fname_abis = ls(contracts_directory, '.abi')
  fname_deployments = ls(contracts_directory, '.deployed')
}
catch(error){
  die(error.message)
}

var web3 = new Web3(new Web3.providers.HttpProvider('http' + (https? 's' : '') + '://' + host + ':' + port))
if (! web3.isConnected){
  die('[Error] Unable to connect to Ethereum client')
}
var network_id = web3.version.network

var contract_abi = {}  // name => {}
var contract_deployment = {}  // name => '0x12345'
var contract_objects = {}  // name => web3.eth.contract(abi).at(addr)
var contract_name, fpath, fcontent, $abi, $addr, $contract

regex = /\.abi$/
fname_abis.forEach((fname) => {
  contract_name = fname.replace(regex, '')

  fpath = contracts_directory + '/' + fname
  try {
    fcontent = fs.readFileSync(fpath).toString()
    $abi = JSON.parse(fcontent)
  }
  catch(e) {return}
  if (! $abi) return
  contract_abi[contract_name] = $abi
  $contract = web3.eth.contract($abi)

  $addr = 0
  fname = contract_name + '.deployed'
  if (fname_deployments.indexOf(fname) >= 0){
    fpath = contracts_directory + '/' + fname
    try {
      fcontent = fs.readFileSync(fpath).toString()
      fcontent = JSON.parse(fcontent)
    }
    catch(e) {fcontent = null}
    if (
      (fcontent) &&
      (fcontent[network_id]) &&
      (fcontent[network_id].length)
    ){
      $addr = fcontent[network_id][fcontent[network_id].length - 1]
      contract_deployment[contract_name] = $addr
      $contract = $contract.at($addr)
    }
  }

  contract_objects[contract_name] = $contract
})

const run_script = function(script){
  var result

  result = vm.runInNewContext(
    script,
    Object.assign({}, contract_objects, {web3}, {console, fs, timer})
  )

  Promise.resolve(result)
  .then(() => {
    process.exit(0)
  })
}

if (inline_script){
  run_script(inline_script)
}

else if (input_file){
  run_script(fs.readFileSync(input_file).toString())
}

else {
  // REPL
  const $console = repl.start({
    prompt: '> '
  });

  const initialize_repl_context = function(context) {
    Object.assign(context, contract_objects, {web3})
  }

  initialize_repl_context($console.context)
  $console.on('reset', initialize_repl_context)
}
