'use strict'

require('dotenv').config()
const mySql = require('mysql')

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

    const specificUser = 'gigaquack'
    const specificSubredditID = 't5_2fwo'

    // amount of comments a specific subreddit gets per day
    const sqlUserCommentsAmount = 
            `SELECT * FROM Comments WHERE author = '${specificUser}'`
    const userCommentsAmountResult = await getFromDB(db, sqlUserCommentsAmount)
    console.log(
        `${specificUser} has posted ${userCommentsAmountResult.length} comments`
    )

    // date of first and date of last, get amount of days
    const sqlGetFirstRow = 'SELECT * FROM Comments ORDER BY created_utc ASC LIMIT 1'
    const firstDateResult = await getFromDB(db, sqlGetFirstRow)
    const firstDateUTCSeconds = firstDateResult[0].created_utc

    const sqlGetLastRow = 'SELECT * FROM Comments ORDER BY created_utc DESC LIMIT 1'
    const lastDateResult = await getFromDB(db, sqlGetLastRow)
    const lastDateUTCSeconds = lastDateResult[0].created_utc

    // get number of days
    const secondsBetween = lastDateUTCSeconds - firstDateUTCSeconds
    const secondsInDay = 86400

    console.log(
        `${secondsBetween / secondsInDay} days between first & last comment`
    )
}

function getFromDB(db, sqlQuery) {
    return new Promise(resolve => 
        db.query(sqlQuery, (err, result) => {
            if (err) throw err
            resolve(result)
    }))
}
