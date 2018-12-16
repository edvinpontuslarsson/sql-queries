'use strict'

require('dotenv').config()
const mySql = require('mysql')
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
    // for specific user, find someone with multiple posts
    // 2007 file - user: gigaquack, subreddit_id: t5_2fwo (programming)

    // perhaps put in object and return that. 

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

    const nestedCommentsConnectedToLink = await getNestedCommentsConnectedToLink(db, specificLink)
    const subredditsConnectedToLink = getSubredditsFromNestedComments(nestedCommentsConnectedToLink)
    console.log(subredditsConnectedToLink)
}

function getFromDB(db, sqlQuery) {
    return new Promise(resolve => 
        db.query(sqlQuery, (err, result) => {
            if (err) throw err
            resolve(result)
    }))
}

// How many comments have a specific user posted?
async function getUserCommentsAmount(db, specificUser) {
    const sqlUserCommentsAmount = 
            `SELECT * FROM Comments WHERE author = '${specificUser}'`
    const userCommentsAmountResult = await getFromDB(db, sqlUserCommentsAmount)
    return userCommentsAmountResult.length
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
async function getNestedCommentsConnectedToLink(db, specificLink) {
    const subreddits = []
    
    return new Promise(async resolve => {
        const sqlUsers = `SELECT * FROM Comments WHERE link_id = '${specificLink}'`
        const usersResult = await getFromDB(db, sqlUsers)
        const users = usersResult.map(row => row.author)

        users.forEach(user => {
            const sqlComments = `SELECT * FROM Comments WHERE author = '${user}'`
            const commentsResult = getFromDB(db, sqlComments)

            subreddits.push(commentsResult)
        })

        resolve(Promise.all(subreddits))
    })
}

function getSubredditsFromNestedComments(nestedComments) {
    const subreddits = nestedComments.flat()
        .map(comment => comment.subreddit)
    return arrayUnique(subreddits)
}
