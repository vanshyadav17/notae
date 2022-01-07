const fs = require('fs');

const express = require('express');
const bodyParser = require('body-parser');

const data = require('./data/data.json');
const userData = require('./data/users.json');
const sessionData = require('./data/sessions.json');

const urlencodedParser = bodyParser.urlencoded({
    extended: false
});

const app = express();

const port = data.config.port;

app.listen(port, '0.0.0.0', () => console.log(`(notae) started server on port ${port}!`));

console.log(validateSession("XYZ987"));

function createUser(email, password, name) {
    userData.accounts.push({
        email: email,
        password: password,
        name: name,
        id: randomString(6, '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'),
        session: "none"
    });
    saveUserData();
}

function deleteUser(email) {
    let index = 0;
    userData.accounts.forEach((account) => {
        if (account.email === email) {
            userData.accounts.splice(index, 1);
            saveUserData();
            return;
        }
        index++;
    })
}

function validateCredentials(email, password) {
    let isValid = false;
    userData.accounts.forEach((account) => {
        if ((account.email.toLowerCase() === email.toLowerCase()) && (account.password === password)) {
            isValid = true;
        }
    });

    return isValid;
}

function createNewSession(id) {
    sessionData.sessions.push({
        id: id,
        token: randomString(10, '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ')
    });
    saveSessionData();
}

function deleteSession(id) {
    let index = 0;
    sessionData.sessions.forEach((session) => {
        if (session.id === id) {
            sessionData.sessions.splice(index, 1);
            saveSessionData();
            return;
        }
        index++;
    });
}

function validateSession(token) {
    let hasValidSession = false;
    sessionData.sessions.forEach((session) => {
        if (session.token == token){
            hasValidSession = true;
        }
    });
    return hasValidSession;
}

function getSession(id) {
    let sessionToReturn;
    sessionData.sessions.forEach((session) => {
        if (session.id == id){
            sessionToReturn = session;
        }
    });
    return sessionToReturn;
}

function getSession(token) {
    let sessionToReturn;
    sessionData.sessions.forEach((session) => {
        if (session.token == token){
            sessionToReturn = session;
        }
    });
    return sessionToReturn;
}

function saveData() {
    fs.writeFileSync('./data/data.json', JSON.stringify(data, null, 1));
}

function saveUserData() {
    fs.writeFileSync('./data/users.json', JSON.stringify(userData, null, 1));
}

function saveSessionData() {
    fs.writeFileSync('./data/sessions.json', JSON.stringify(sessionData, null, 1));
}

function randomString(length, chars) {
    var isUnique = false;
    var result = '';
    for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
    return result;
}