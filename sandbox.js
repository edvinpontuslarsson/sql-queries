'use strict'

const exclusive = ['a', 'a', 'a']
const notExclusive = ['c', 'a', 'b', 'b', 'g']

console.log(
    exclusive.every(item => item === exclusive[0]) + ' true'
)

console.log(
    notExclusive.every(item => item === exclusive[0]) + ' false'
)
