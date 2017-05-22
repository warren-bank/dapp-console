#! /usr/bin/env node

const yargs = require('yargs')
const vm = require('vm')
const repl = require('repl')
const fs = require('fs')
const Web3 = require('web3')
const timer = require('timers')
const path = require('path')

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
      describe: 'Path to javascript file to execute, then quit.',
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

const additional_context_variables = function(){
  var toAscii

  // I've noticed there's an issue with the "web3" implementation.
  // It converts a "bytes32" to 32 ascii characters.
  // When the string contains fewer than 32 characters, the string is (right) padded with unicode: "\u0000"
  // When the string is written to file, this character sequence denotes an EOF marker.
  // When several such strings are written to file in sequence,
  // (ex: several "console.log" statements in an input .js file, where the results are piped to an output log file)
  // only the first string appears in the file..
  // as the remainder occur after the EOF marker.
  //
  // workaround:
  // wrap the "web3" implementation in a function that sanitizes the output.
  // from within a script: call "toAscii(hex), rather than "web3.toAscii(hex)"
  toAscii = function(hex){
    return web3.toAscii(hex).replace(/(?:\u0000)+$/, '')
  }

  return {toAscii}
}

const run_script = function(script, fpath){
  var fcontext, result

  // wrap 'script' code inside an anonymous self-invoking function.
  // by doing so, the `return` keyword can be used to pass a `Promise` to 'result'.
  // otherwise, the final statement in the block of 'script' code would need to evaluate to the `Promise`,
  // which, imho, is a coding style that's restrictive and awkward to use.
  script = '(function(){' + "\n" + script + "\n" + '})()'

  fcontext = {}
  if (fpath){
    // for scripts that are read from an input file,
    // include additional filesystem-related context variables.
    fcontext = (function(){
      var $cwd, $realpath, $dirname, $filename
      $cwd = process.cwd()
      if (path.isAbsolute(fpath)){
        $realpath = fpath
      }
      else {
        $realpath = $cwd + '/' + fpath
        $realpath = path.normalize($realpath)
      }
      $dirname = path.dirname($realpath)
      $filename = path.basename($realpath)
      return {
        "__cwd": $cwd,
        "__realpath": $realpath,
        "__dirname": $dirname,
        "__filename": $filename
      }
    })()
  }

  result = vm.runInNewContext(
    script,
    Object.assign({}, fcontext, contract_objects, {web3}, {console, path, fs, timer}, additional_context_variables())
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
  run_script(fs.readFileSync(input_file).toString(), input_file)
}

else {
  // REPL
  const $console = repl.start({
    prompt: '> '
  });

  const initialize_repl_context = function(context) {
    Object.assign(context, contract_objects, {web3}, additional_context_variables())
  }

  initialize_repl_context($console.context)
  $console.on('reset', initialize_repl_context)
}
