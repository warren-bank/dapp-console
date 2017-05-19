var result

result = Ballot.chairperson()
console.log('Ballot Chairperson: ', result)

var accts = web3.eth.accounts
var a0 = accts[0]
var a1 = accts[1]
var a2 = accts[2]
var a3 = accts[3]

Ballot.giveRightToVote(a1, {from:a0})
Ballot.giveRightToVote(a2, {from:a0})
Ballot.giveRightToVote(a3, {from:a0})

Ballot.delegate(a1, {from:a2})
Ballot.delegate(a1, {from:a3})

// 'Crook B' x3
Ballot.vote(1, {from:a1})

result = Ballot.winnerName()
result = web3.toAscii(result)
console.log('winner:', result)
