### [dapp-console](https://github.com/warren-bank/dapp-console)

#### Description:

Command-line REPL javascript console. [`web3.js`](https://github.com/ethereum/web3.js/) provides access to an Ethereum blockchain. Compiled contracts are represented as objects. Each deployed contract (with available [`dapp-deploy`](https://github.com/warren-bank/dapp-deploy) metadata) is associated with its on-chain address.

#### Installation:

```bash
npm install -g @warren-bank/dapp-console
```

#### Simple Example:

```bash
lxterminal -e testrpc

mkdir ~/my_dapp
cd ~/my_dapp

dapp init
dapp deploy
dapp console

# > typeof web3
# 'object'

# > web3.eth.accounts
# [ '0xd9aac9e3ad5c0a8e31e9f6c97eb65de594b2d1ce',
#   '0xc0f332c8d93b642100d97d25200711b0e1e0a7a4',
#   '0xf3409d30955200079cc2f45eeb2a15e404ffde7f',
#   '0x7941b525c26fe13046010a09c3770d7ac9f5b4e7',
#   '0x3c99d0bf3c9f531df22153983d1eaa6ea937fc5a',
#   '0xdecdf444097fc18e4bfb8f9ccf9902c9b42fa9e3',
#   '0xf467e060531229521f92e128469870e111d19ab3',
#   '0x0dbdf14919e1a0ce6996e1908c86c63e74353d0a',
#   '0x351b1ca0bc8b8ff41a3eaf0e9b321d4f74e5bed4',
#   '0xc82b8fec5aa10a93b8dcc00d75b1bfe9ebc668c6' ]

# > typeof DSTest
# 'object'

# > typeof Test
# 'object'

# > Test.address
# '0x12345'

# > Test.IS_TEST()
# true

# > Test.test_basic_sanity.call()
# []
```

#### Options:

```text
$ dapp-console --help

Command-line REPL javascript console.
'Web3.js' provides access to an Ethereum blockchain.
Compiled contracts are represented as objects.
Each deployed contract (with available 'dapp-deploy' metadata)
is associated with its on-chain address.

Usage: dapp-console [options]


Options:
 -h, --host                 Ethereum JSON-RPC server hostname  [string] [default: "localhost"]
 -p, --port                 Ethereum JSON-RPC server port number  [number] [default: 8545]
 --tls, --https, --ssl      Require TLS handshake (https:) to connect to Ethereum JSON-RPC server  [boolean] [default: false]
 -d, --contracts_directory  Path to directory containing all contract artifacts: (.abi, .deployed)
                            note: The default path assumes that the current directory is the root of a compiled "dapp" project.  [string] [default: "./out"]
 -i, --input_file           Path to javascript file to execute, then quit.  [string]
 -e, --execute              Inline javascript to execute, then quit  [string]
 --help                     Show help  [boolean]

Examples:
 dapp-console                                                                  connect to: "http://localhost:8545"
 dapp-console -h "mainnet.infura.io" -p 443 --ssl                              connect to: "https://mainnet.infura.io:443"
 dapp-console -d "/path/to/compiled/contracts"                                 load contracts into REPL console
 dapp-console -i "/path/to/script.js"                                          execute a script file
 dapp-console -e 'console.log("unlocked accounts:", "\n", web3.eth.accounts)'  execute an inline script

copyright: Warren Bank <github.com/warren-bank>
license: GPLv2
```

#### Legal:

* copyright: [Warren Bank](https://github.com/warren-bank)
* license: [GPLv2](https://www.gnu.org/licenses/old-licenses/gpl-2.0.txt)
