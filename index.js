'use strict'

require('dotenv').config()
const mySql = require('mysql')
const arrayChunk = require('array-chunk')
const arrayUnique = require('array-unique')

;(() => {
    const db = getDbConnection()
    performQueries(db)
})()

function getDbConnection () {
    return mySql.createConnection({
        host: process.env.hostname,
        user: process.env.mysql_username,
        password: process.env.mysql_password,
        database: process.env.database_name,
        charset: 'utf8mb4',
        debug: false
    })
}

async function performQueries(db) {
    const specificUser = 'gigaquack'
    const specificSubreddit = 'programming'
    const specificSubredditID = 't5_2fwo'
    const specificLink = 't3_5yba1'

    const userCommentsAmount = await getUserCommentsAmount(db, specificUser)
    console.log(`${specificUser} has posted ${userCommentsAmount} comments`)

    const averageSubredditCommentsAmount = 
        await getAverageSubredditCommentsAmount(db, specificSubredditID)
    console.log(
        `The subreddit "${specificSubreddit}" gets an average of ${averageSubredditCommentsAmount} comments per day`
    )

    const amountOfCommentsContainingLOL = await getAmountOfCommentsContainingLOL(db)
    console.log(
        `${amountOfCommentsContainingLOL} comments include the word "lol"`
    )

    const subsFromLink = await getSubsFromLink(db, specificLink)
    console.log(
        `Users that commented on ${specificLink} also posted to these subreddits: ${subsFromLink}`
    )
}

// How many comments have a specific user posted?
async function getUserCommentsAmount(db, specificUser) {
    const sqlUserCommentsAmount = 
            `SELECT combined_score FROM Authors WHERE author = '${specificUser}'`
    const userCommentsAmountResult = await getFromDB(db, sqlUserCommentsAmount)
    return userCommentsAmountResult[0].combined_score
}

// How many comments does a specific subreddit get per day?
async function getAverageSubredditCommentsAmount(db, specificSubredditID) {
    const sqlGetFirstRow = 'SELECT * FROM Comments ORDER BY created_utc ASC LIMIT 1'
    const firstDateResult = await getFromDB(db, sqlGetFirstRow)
    const firstDateUTCSeconds = firstDateResult[0].created_utc

    const sqlGetLastRow = 'SELECT * FROM Comments ORDER BY created_utc DESC LIMIT 1'
    const lastDateResult = await getFromDB(db, sqlGetLastRow)
    const lastDateUTCSeconds = lastDateResult[0].created_utc

    const secondsBetween = lastDateUTCSeconds - firstDateUTCSeconds
    const secondsInDay = 86400
    const daysAmount = secondsBetween / secondsInDay

    const sqlGetTotalSubredditCommentsAmount =
        `SELECT * FROM Comments WHERE subreddit_id = '${specificSubredditID}'`
    const totalSubredditCommentsAmountResult = 
        await getFromDB(db, sqlGetTotalSubredditCommentsAmount)

    return totalSubredditCommentsAmountResult.length / daysAmount
}

// How many comments include the word ‘lol’?
async function getAmountOfCommentsContainingLOL(db) {
    const sqlLOLAmount = 
        `SELECT * FROM Comments WHERE body LIKE '%lol%'`
    const lolAmountResult = await getFromDB(db, sqlLOLAmount)
    return lolAmountResult.length
}

// Users that commented on a specific link has also posted to which subreddits?
// SELECT * FROM Comments where author = '${author}' AND subreddit_id <> '${subredditId}'`

async function getSubsFromLink(db, specificLink) {
    const authors = await getAuthorsFromLink(db, specificLink)
    const subIDs = await getSubIDsFromAuthor(db, specificLink)
}

function getAuthorsFromLink(db, specificLink) {
    return new Promise(resolve => {
        const sqlAuthors = 
        `SELECT DISTINCT author FROM Comments WHERE link_id = '${specificLink}'`
        const authors = getFromDB(db, sqlAuthors)
        resolve(authors)
    })
}

function getSubIDsFromAuthor(db, author) {
    return new Promise(resolve => {
        const sqlSubIDs = 
            `SELECT subreddit_id FROM Comments WHERE author = ${author}`
        const subIDs = getFromDB(db, sqlSubIDs)
        resolve(subIDs)
    })
}

function getFromDB(db, sqlQuery) {
    return new Promise(resolve => 
        db.query(sqlQuery, (err, result) => {
            if (err) throw err
            resolve(result)
    }))
}
