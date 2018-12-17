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
        `Users that commented on the link ${specificLink} also posted to these subreddits: ${subsFromLink}`
    )

    const highScoreUsers = await getHighScoreUsers(db)
    const lowScoreUsers = await getLowScoreUsers(db)
    console.log(`${highScoreUsers[0].author} have the highest scored comments of ${highScoreUsers[0].combined_score}`)
    console.log(`${lowScoreUsers} has the lowest scored comments`)
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
async function getSubsFromLink(db, specificLink) {
    const authorsResult = await getAuthorsFromLink(db, specificLink)
    const subIDsResult = await getSubIDsFromAuthors(db, authorsResult)
    const subIDs = arrayUnique(subIDsResult.flat())
        .map(item => item.subreddit_id)
    const subResult = await getSubsFromIDs(db, subIDs)
    const subs = subResult.map(item => item[0].subreddit)
    return arrayUnique(subs).join(', ')
}

function getAuthorsFromLink(db, specificLink) {
    return new Promise(resolve => {
        const sqlAuthors = 
        `SELECT DISTINCT author FROM Comments WHERE link_id = '${specificLink}'`
        const authors = getFromDB(db, sqlAuthors)
        resolve(authors)
    })
}

function getSubIDsFromAuthors(db, authors) {
    const subIDs = []

    return new Promise(resolve => {
        for (const authorObj of authors) {
            const sqlSubIDs = 
            `SELECT DISTINCT subreddit_id FROM 
                Comments WHERE author = '${authorObj.author}'`
            const authorSubIDs = getFromDB(db, sqlSubIDs)
            subIDs.push(authorSubIDs)
        }
        
        resolve(Promise.all(subIDs))
    })
}

function getSubsFromIDs(db, subIDs) {
    const subs = []

    return new Promise(resolve => {
        for (const id of subIDs) {
            const sqlSub = 
                `SELECT subreddit from Subreddits where subreddit_id = '${id}'`
            const sub = getFromDB(db, sqlSub)
            subs.push(sub)
        }

        resolve(Promise.all(subs))
    })
}

// Which users have the highest and lowest combined scores? (combined as the sum of all scores)
async function getHighScoreUsers(db) {
    const max = await getMaxScore(db)
    const sqlGetHighScoreUsers = 
        `SELECT * FROM Authors WHERE combined_score = '${max[0].score}'`
    const highScoreUsers = await getFromDB(db, sqlGetHighScoreUsers)
    return highScoreUsers
}

function getMaxScore(db) {
    return new Promise(resolve => {
        const sqlMaxScore = 'SELECT MAX(combined_score) AS score FROM Authors'
        const max = getFromDB(db, sqlMaxScore)
        resolve(max)
    })
}

function getLowScoreUsers(db) {

}

function getFromDB(db, sqlQuery) {
    return new Promise(resolve => 
        db.query(sqlQuery, (err, result) => {
            if (err) throw err
            resolve(result)
    }))
}
