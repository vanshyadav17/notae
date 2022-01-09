const fs = require('fs');

const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser')
const querystring = require('querystring');

const vision = require('@google-cloud/vision');
// const { short } = require('webidl-conversions');

const client = new vision.ImageAnnotatorClient();

const data = require('./data/data.json');
const userData = require('./data/users.json');
const sessionData = require('./data/sessions.json');


const urlencodedParser = bodyParser.urlencoded({
    extended: false
});

const app = express();

const port = data.config.port;

app.listen(port, '0.0.0.0', () => console.log(`(notae) started server on port ${port}!`));

app.use(bodyParser.json({limit: '50mb'}));

app.use(cookieParser());

app.get('/login', (req, res) => {

    let successQuery = req.query.success;

    if (successQuery === "no") {
        res.sendFile('./assets/login-failed.html', {
            root: __dirname
        });
        return;
    }

     res.sendFile('./assets/login.html', {
            root: __dirname
     });
})

app.get('/add', (req, res) => {
    const user = getUserFromCookie(req);

    if(user == null) {
        res.redirect('/login');
        return;
    }

    const page = fs.readFileSync('./assets/addnote.html', 'utf-8');

    res.send(page);
})

app.post('/addimg', (req, res) => {
    const URL = req.body.encoded;

    const pngName = randomString(8, '0123456789ABCDE');

    fs.writeFileSync(`./tmp/${pngName}.png`, URL, 'base64');

    console.log("here");

    start(`./tmp/${pngName}.png`).then((response) => {

        const shorthands = getUserShorthands(getUserFromCookie(req));

        console.log("response generated");

        let fullText = response.fullTextAnnotation.text.toString().split('\n');

        const subject = fullText[0].split("/")[0].replaceAll(" ", "");
        const topic = fullText[0].split("/")[1];
        const date = fullText[1].replaceAll(" ", "");

        let i = 0;
        let txt = "";

        fullText.forEach((line) => {
            if(i > 1) {
                txt = txt + " " + fullText[i];
            }
            i++;
        });

        txt = txt.substring(1);

        let finalTxt = "";

        console.log(shorthands);

        Object.keys(shorthands).forEach((key) => {
            const value = shorthands[key];
            console.log(`${key}:${value}`);
            txt = txt.replaceAll(key, value);
        });

        const noteObject = {
            subject: subject,
            topic: topic,
            date: date,
            content: txt
        }
        
        console.log(noteObject);

        const redirectURL = "/confirm?" + querystring.stringify(noteObject);

        res.send(redirectURL);
    })

    // write the image to the file system

    // use google api to get back written text

    // send link in response to where to redirect

    // make the frontend js redirect
    
    // // redirect to a config page which has fields with all the data filled in

});

app.post('/confirmnote', urlencodedParser, (req, res) => {
    const user = getUserFromCookie(req);

    if(user == null) {
        res.redirect('/login');
        return;
    }

    createNewNote(user, req.body.subject, req.body.topic, req.body.date, req.body.content);
    res.send("OK");

})

app.get('/confirm', (req, res) => {

    const subject = req.query.subject;
    const topic = req.query.topic;
    const date = req.query.date;
    const content = req.query.content;

    const page = fs.readFileSync('./assets/confirm-new-note.html', 'utf-8')
        .replace('{subjectdata}', subject)
        .replace('{topicdata}', topic)
        .replace('{datedata}', date)
        .replace('{contentdata}', content);

    res.send(page);

})

app.get('/', (req, res) => {
    console.log(req.cookies);

    const user = getUserFromCookie(req);

    if(user == null) {
        res.redirect('/login');
    } 

    res.redirect('/home');
});

app.get('/notes', (req, res) => {

    const top = fs.readFileSync('./assets/mynotes-1.html', 'utf-8');
    const bottom = fs.readFileSync('./assets/mynotes-2.html', 'utf-8');

    const format = fs.readFileSync('./assets/mynotes-format.html', 'utf-8');

    const user = getUserFromCookie(req);

    let notesHTML = "";

    getUserNotesData(user).notes.forEach((note) => {
        let x = format;
        
        x = x.replaceAll('{id}', note.id)
         .replaceAll('{date}', note.date)
         .replaceAll('{topic}', note.topic)
         .replaceAll('{subject}', note.subject);
        console.log(x);
        notesHTML = notesHTML + x;
    });

    const finalPage = top + notesHTML + bottom;
    
    res.send(finalPage);
});

app.get('/note', (req, res) => {
    const user = getUserFromCookie(req);
    const id = req.query.id;

    const note = getNoteByID(user, id);

    console.log(note);

    const page = fs.readFileSync('./assets/note.html', 'utf-8').replaceAll('{date}', note.date)
                                                               .replaceAll('{topic}', note.topic)
                                                               .replaceAll('{subject}', note.subject)
                                                               .replaceAll('{content}', note.content);
    res.send(page);
    

})


app.get('/home', (req, res) => {

    const user = getUserFromCookie(req);

    if(user == null) {
        res.redirect('/login');
        return;
    }

    const page = fs.readFileSync('./assets/home.html', 'utf8')
        .replaceAll('{user}', user.name);

    res.send(page);
});

app.post('/auth', urlencodedParser, (req, res) => {

    const email = req.body.email;
    const password = req.body.password;

    if(validateCredentials(email, password)) {
        const user = getUserFromEmail(email);

        if(getSessionFromID(user.id) != null) {
            deleteSession(user.id);
        }
        createNewSession(user.id);

        res.cookie('sessionToken', getSessionFromID(user.id).token);

        res.send("success!!");

    } else {
        let string = encodeURIComponent('no'); 
        res.redirect('/login?success=' + string);
    }

    // console.log(req.body);
    // if(validateCredentials(req.body.email, req.body.password)) {
    //     const user = getUserFromEmail(req.body.email);
        
    //     if(getSessionFromID(user.id) != null) {
    //         deleteSession(user.id);
    //     }
    //     createNewSession(user.id);
    //     res.json({
    //         status: "OK",
    //         token: getSessionFromID(user.id).token
    //     })
    // } else {
    //     res.json({
    //         status: "FAILED"
    //     })
    // }
})

function createUser(email, password, name) {
    let id = randomString(6, '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');
    userData.accounts.push({
        email: email,
        password: password,
        name: name,
        id: id,
        session: "none"
    });
    saveUserData();

    fs.writeFileSync(`./data/notedata/${id}.json`, JSON.stringify({
        shorthands: {},
        notes: []
    }, null, 1));
}

function getUserFromEmail(email) {
    let userToReturn = null;
    userData.accounts.forEach((account) => {
        if(account.email === email) {
            userToReturn = account;
        }
    })
    return userToReturn;
}

function getUserFromID(id) {
    let userToReturn = null;
    userData.accounts.forEach((account) => {
        if(account.id === id) {
            userToReturn = account;
        }
    })
    return userToReturn;
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

function getSessionFromID(id) {
    let sessionToReturn = null;
    sessionData.sessions.forEach((session) => {
        if (session.id == id){
            sessionToReturn = session;
        }
    });
    return sessionToReturn;
}

function getSessionFromToken(token) {
    let sessionToReturn = null;
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

function getUserFromCookie(req) {

    let userToReturn = null;

    if(!(typeof req.cookies.sessionToken === 'undefined')) {

        const token = req.cookies.sessionToken;

        if(validateSession(token)) {
            const session = getSessionFromToken(req.cookies.sessionToken);
            userToReturn = getUserFromID(session.id);
        }
        
    }

    return userToReturn;

}

async function start(fileName) {
    const [result] = await client.textDetection(fileName);
    return result;
}

function getPseudoNote(fileName, shorthands) {
    console.log("in here");
    start(fileName).then((response) => {

        console.log("response generated");

        let fullText = response.fullTextAnnotation.text.toString().split('\n');

        const subject = fullText[0].split("/")[0].replaceAll(" ", "");
        const topic = fullText[0].split("/")[1];
        const date = fullText[1].replaceAll(" ", "");

        let i = 0;
        let txt = "";

        fullText.forEach((line) => {
            if(i > 1) {
                txt = txt + " " + fullText[i];
            }
            i++;
        });

        txt = txt.substring(1);

        let finalTxt = "";

        Object.keys(shorthands).forEach((key) => {
            const value = shorthands[key];
            console.log(`${key}:${value}`);
            txt = txt.replaceAll(key, value);
        });

        const noteObject = {
            subject: subject,
            topic: topic,
            date: date,
            content: txt
        }
        
        return noteObject;
    }).catch(err => {
        console.log("ERROR");
        return null;
    });
}


function getUserNotes(user) {
    const notesData = require(`./data/notedata/${user.id}.json`);
    return notesData.notes;
}

function createNewNote(user, subject, topic, date, content) {
    const notesData = require(`./data/notedata/${user.id}.json`);
    notesData.notes.push({
        subject: subject,
        topic: topic,
        date: date,
        content: content,
        id: randomString(4, "1234567890ASDFGHJK")
    });
    
    fs.writeFileSync(`./data/notedata/${user.id}.json`, JSON.stringify(notesData, null, 1));
} 

function deleteNote(user, topic) {
    const notesData = require(`./data/notedata/${user.id}.json`);

    let index = 0;
    notesData.notes.forEach((note) => {
        if (note.topic === topic) {
            userData.accounts.splice(index, 1);
            fs.writeFileSync(`./data/notedata/${user.id}.json`, JSON.stringify(notesData, null, 1));
            return;
        }
        index++;
    })

}

function getUserShorthands(user) {

    return getUserNotesData(user).shorthands;
}

function setUserShorthands(user, shorthands) {
    const notesData = getUserNotesData(user);
    notesData.shorthands = shorthands;
    saveUserNotesData(user, notesData);
} 

function getUserNotesData(user) {
    const notesData = require(`./data/notedata/${user.id}.json`);
    return notesData;
}

function saveUserNotesData(user, newData) {
    fs.writeFileSync(`./data/notedata/${user.id}.json`, JSON.stringify(newData, null, 1));
}

function getNoteByID(user, id) {
    const userNoteData = getUserNotesData(user);
    let noteToReturn = null;
    userNoteData.notes.forEach((note) => {
        console.log(`note id: ${note.id} : looking for ${id}`);
        if(note.id === id) {
            noteToReturn = note;
        }
    })
    return noteToReturn;
}