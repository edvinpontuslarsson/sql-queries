'use strict'

const allStudents = [
    {
        name: 'Mario',
        subject: 'Biology'
    },
    {
        name: 'Marge Simpson',
        subject: 'Math'
    },
    {
        name: 'Marge Simpson',
        subject: 'Psychology'
    },
    {
        name: 'Mario',
        subject: 'Computer Science'
    },
    {
        name: 'Donald Duck',
        subject: 'Physics'
    },
    {
        name: 'Batman',
        subject: 'Batman!'
    },
    {
        name: 'Batman',
        subject: 'Batman!'
    },
    {
        name: 'Batman',
        subject: 'Batman!'
    },
    {
        name: 'Batman',
        subject: 'Batman!'
    },
    {
        name: 'Batman',
        subject: 'Batman!'
    },
    {
        name: 'Mario',
        subject: 'Law'
    }
]

// find out which students only take one subject

const singleSubjectStudents = []

for(let i = 0; i < allStudents.length; i++) {
    if (singleSubjectStudents.length === 0) 
        singleSubjectStudents.push(allStudents[i])
    else {
        for(let j = 0; j < singleSubjectStudents.length; j++) {
            if(
                allStudents[i].name === singleSubjectStudents[j].name
                && allStudents[i].subject !== singleSubjectStudents[j].subject
            ) {
                singleSubjectStudents.splice(j, 1) // removes from array
            }
        }
    }
}

console.log(singleSubjectStudents)
