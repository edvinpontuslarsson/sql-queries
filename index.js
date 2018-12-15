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

function performQueries(db) {
    // for specific user, find someone with multiple posts
    // 2007 file - user: gigaquack, subreddit_id: t5_2fwo (programming)

    const specificUser = 'gigaquack'
    const specificSubredditID = 't5_2fwo'

    // amount of comments by specific user:
    const sqlUserCommentsAmount = 
        `SELECT * FROM Comments WHERE author = '${specificUser}'`
    db.query(sqlUserCommentsAmount, (err, result) => {
        if (err) throw err
        console.log(
            `${specificUser} has posted ${result.length} comments`
        )
    })

    // amount of comments a specific subreddit gets per day

    // date of first and date of last, get amount of days

    const sqlGetFirstRow = 'SELECT * FROM Comments ORDER BY created_utc DESC LIMIT 1'
    db.query(sqlGetFirstRow, (err, result) => {
        if (err) throw err
        console.log(result)
    })
}
