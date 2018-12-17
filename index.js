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
    const specificUser = 'gigaquack'
    const specificSubreddit = 'programming'
    const specificSubredditID = 't5_2fwo'
    const specificLink = 't3_5yba1'

    const userCommentsAmount = await getUserCommentsAmount(db, specificUser)
    console.log(`${specificUser} has posted ${userCommentsAmount} comments`)

    const averageSubredditCommentsAmount = 
        await getAverageSubredditCommentsAmount(db, specificSubredditID)
    console.log(
        `The subreddit "${specificSubreddit}" got an average of ${averageSubredditCommentsAmount} comments per day`
    )

    const amountOfCommentsContainingLOL = await getAmountOfCommentsContainingLOL(db)
    console.log(
        `${amountOfCommentsContainingLOL} comments include the word "lol"`
    )

    const subsFromLink = await getSubsFromLink(db, specificLink)
    console.log(
        `Users that commented on the link ${specificLink} also posted to these subreddits: ${subsFromLink}`
    )

    const highScoreUsersResult = await getHighScoreUsers(db)
    const lowScoreUsersResult = await getLowScoreUsers(db)

    const highScoreUsers = highScoreUsersResult.map(item => item.author).join(', ')
    const lowScoreUsers = lowScoreUsersResult.map(item => item.author).join(', ')

    console.log(`The users ${highScoreUsers} have the highest combined score with ${highScoreUsersResult[0].combined_score}`)
    console.log(`The users ${lowScoreUsers} have the lowest combined score with ${lowScoreUsersResult[0].combined_score}`)

    const maxScoreSubsResult = await getSubredditsWithMaxComment(db)
    const lowScoreSubsResult = await getSubredditsWithMinimumComment(db)
    
    const maxScoreSubs = arrayUnique(
        maxScoreSubsResult.map(item => item[0].subreddit)
    ).join(', ')

    const lowScoreSubs = arrayUnique(
        lowScoreSubsResult.map(item => item[0].subreddit)
    ).join(', ')

    console.log(`The subreddits ${maxScoreSubs} have the highest scored comments`)
    console.log(`The subreddits ${lowScoreSubs} have the lowest scored comments`)

    const aUser = 'tinha'

    const linksByUser = await getLinksConnectedToUser(db, aUser)
    const usersConnectedToUserResult = await getUsersConnectedToLinks(db, linksByUser)
    const usersConnectedToUser = arrayUnique(
        usersConnectedToUserResult.flat().map(item => item.author)
    ).join(', ')
    console.log(
        `${aUser} has potentially interacted with ${usersConnectedToUser}`
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
                `SELECT subreddit from Subreddits WHERE subreddit_id = '${id}'`
            const sub = getFromDB(db, sqlSub)
            subs.push(sub)
        }

        resolve(Promise.all(subs))
    })
}

// Which users have the highest and lowest combined scores? (combined as the sum of all scores)
async function getHighScoreUsers(db) {
    const max = await getMaxCombinedScore(db)

    const sqlGetHighScoreUsers =
        `SELECT * FROM Authors WHERE combined_score = '${max[0].score}'`
    const highScoreUsers = getFromDB(db, sqlGetHighScoreUsers)
    return highScoreUsers
}

async function getLowScoreUsers(db) {
    const min = await getMinCombinedScore(db)
    const sqlGetLowScoreUsers =
        `SELECT * FROM Authors WHERE combined_score = '${min[0].score}'`
    const lowScoreUsers = getFromDB(db, sqlGetLowScoreUsers)
    return lowScoreUsers
}

function getMaxCombinedScore(db) {
    return new Promise(resolve => {
        const sqlMaxComboScore = 'SELECT MAX(combined_score) AS score FROM Authors'
        const maxCombo = getFromDB(db, sqlMaxComboScore)
        resolve(maxCombo)
    })
}

function getMinCombinedScore(db) {
    return new Promise(resolve => {
        const sqlMinComboScore = 'SELECT MIN(combined_score) AS score FROM Authors'
        const minCombo = getFromDB(db, sqlMinComboScore)
        resolve(minCombo)
    })
}

// Which subreddits have the highest and lowest scored comments?
function getSubredditsWithMaxComment(db) {
    const subs = []

    return new Promise(async resolve => {
        const highScoreComments = await getHighScoreComments(db)

        for (const comment of highScoreComments) {
            const sqlCommentSub = 
                `SELECT subreddit FROM Subreddits WHERE 
                    subreddit_id = '${comment.subreddit_id}'`
            const sub = getFromDB(db, sqlCommentSub)
            subs.push(sub)
        }

        resolve(Promise.all(subs))
    })
}

function getSubredditsWithMinimumComment(db) {
    const subs = []

    return new Promise(async resolve => {
        const lowScoreComments = await getLowScoreComments(db)

        for (const comment of lowScoreComments) {
            const sqlCommentSub = 
                `SELECT subreddit FROM Subreddits WHERE 
                    subreddit_id = '${comment.subreddit_id}'`
            const sub = getFromDB(db, sqlCommentSub)
            subs.push(sub)
        }

        resolve(Promise.all(subs))
    })
}

async function getHighScoreComments(db) {
    const max = await getMaxScore(db)
    const sqlHighScoreComments = 
        `SELECT * FROM Comments WHERE score = ${max[0].score}`
    const highScoreComments = getFromDB(db, sqlHighScoreComments)
    return highScoreComments
}

async function getLowScoreComments(db) {
    const min = await getMinScore(db)
    const sqlLowScoreComments = 
        `SELECT * FROM Comments WHERE score = ${min[0].score}`
    const lowScoreComments = getFromDB(db, sqlLowScoreComments)
    return lowScoreComments
}

function getMaxScore(db) {
    return new Promise(resolve => {
        const sqlMax = 'SELECT MAX(score) AS score FROM Comments'
        const max = getFromDB(db, sqlMax)
        resolve(max)
    })
}

function getMinScore(db) {
    return new Promise(resolve => {
        const sqlMin = 'SELECT MIN(score) AS score FROM Comments'
        const min = getFromDB(db, sqlMin)
        resolve(min)
    })
}

// Given a specific user, list all the users he or she has potentially interacted with (i.e., everyone who as commented on a link that
// the specific user has commented on).
function getLinksConnectedToUser(db, specificUser) {
    const sqlLinks = `SELECT link_id FROM Comments WHERE author = '${specificUser}'`
    return getFromDB(db, sqlLinks)
}

function getUsersConnectedToLinks(db, links) {
    const allUsers = []

    return new Promise(resolve => {
        for (let i = 0; i < links.length; i++) {
            const sqlUsers =
                `SELECT author FROM Comments WHERE link_id = '${links[i].link_id}'`
            const users = getFromDB(db, sqlUsers)
            allUsers.push(users)
        }

        resolve(Promise.all(allUsers))
    })
}

function getFromDB(db, sqlQuery) {
    return new Promise(resolve => 
        db.query(sqlQuery, (err, result) => {
            if (err) throw err
            resolve(result)
    }))
}
