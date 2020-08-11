const request = require('request');//request used to get the trivia questions
const path = require('path')//used for the html link
const http = require('http');//used for the get request for the script and html file
const fs = require('fs');//used for the readstream
const options = {//getting the trivia questions
    url: 'https://opentdb.com/api.php?amount=5&type=multiple',
    method: 'GET',
    headers: {
        'Accept': 'appplication/json',
        'Accept-Charset': 'utf-8'
    }

};
let questions;//variable used to store the whole api
let questionnum;///variable used to store the collection of different questions
let number = 0;//used to determine the index/ which question to display
request(options, function (err, res, body) {

    questions = JSON.parse(body);//gets the entire api 
    questionnum = questions["results"]//store the array of questions


});
function send404(response) {//error 404
    response.writeHead(404, { 'Content-Type': 'text/plain' });
    response.write('error 404: Resource not found');
    response.end();
}
let server = http.createServer(function (req, res) {
    if (req.method == 'GET') {
        if (req.url == '/') {//gets the html file upon loading the link
            res.writeHead(200, { 'content-type': 'text/html' });
            fs.createReadStream(path.resolve(__dirname + '/trivia.html')).pipe(res);

        } else if (req.url == '/trivia.js') {//connects to the client-side script
            res.writeHead(200, { 'content-type': 'text/html' });
            fs.createReadStream(path.resolve(__dirname + '/trivia.js')).pipe(res);

        }
        else {//if its neither of those get requests, send a 404 message
            send404(res);
        }

    } else {//if its anything different from a GET req send an error message
        send404(res);
    }
});
server.listen(4000);//listening to the server of port 4000

let count;//used to initialize the timer at 30s
let count2;//used for setting an interval delay for the timer
let accounts = [];//stores all players
let counter;//reference to the current timer that is running
let msgs = [];//stores the messages

console.log('server running on port http://localhost:4000/');//link to website
const io = require("socket.io")(server);
io.on('connection', socket => {
    console.log("A connection was made");
    socket.on("register", name => {//connection when player joins

        socket.username = name;
        if (accounts.length < 1 || number == questionnum.length - 1) {//if there is no more players or the round reaches its end
            number = 0;//reset the index to the first question


        }
        if (accounts.length == 0) {//used to start the timer as soon as a player joins
            timer2();
        }
        accounts.push({ "player": socket.username, "score": 0, "answered": false });//store an object with attribute scire,name and answered
        //answered is used to determine weither the player has answered the question


        socket.emit("init", JSON.stringify({ displaymsg: msgs }))//initialize the messages
        io.emit("newPerson", name);//emit the name to the client side
        io.emit("newplayer", JSON.stringify(accounts))//emit all players in the lobby to the client side
        //used to display all players
        socket.emit("questioncall", JSON.stringify(questionnum[number]))//send the questions to the client side

    })

    socket.on("newmsg", message => {
        message = socket.username + " : " + message//message the user sends
        msgs.push(message);//storing the message
        io.emit("newmsg", message)//emitting the message to the clientside
    })
    socket.on('calc', data => {//used to get the timer from client side when the person chooses an answer
        counter = data;////returns the time which he selected an answer
        if (counter < 20) {//when theres 20 secs left
            socket.emit('disable', JSON.stringify(questionnum[number].incorrect_answers[0]));//gives user a hint by removing a wrong answer
        }
        if (counter < 10) {//when theres 10secs left
            socket.emit('disable', JSON.stringify(questionnum[number].incorrect_answers[1]));//gives user another hint

        }
        r();//returns the time

    })
    function r() {//function to get the timer on server side
        return counter;
    }

    socket.on('disconnect', () => {

        io.emit("left", socket.username);//displays a user has left message
        for (let i = 0; i < accounts.length; i++) {//loop through all players
            if (socket.username == accounts[i].player) {//if the name of the user is the same as the one in the array

                accounts.splice(i, 1);//remove the user from the array
            }
            if (accounts.length == 0) {//if there is nobody playing reset the timer
                timer2();
            }
        }
        nextQuestion();//function calls the question to be displayed

        io.emit("newplayer", JSON.stringify(accounts));//emits collection of all players
    })
    let total;
    socket.on("scoreIncrease", data => {//used to calculate the score of the player

        for (var i = 0; i < accounts.length; i++) {
            if (socket.username == accounts[i].player) {


                if (data == "correct") {//if the player gets the correct answer
                    if (r() > 25) {//checks if the the player answered within 5 secs
                        total = 100;
                    } else if (r() > 20 && r() <= 25) {//if  theres above 25 secs
                        total = 75
                    } else if (r() > 15 && r() <= 20) {//above 20 secs
                        total = 50;
                    } else {//less than 15 secs left
                        total = 25;
                    }

                    accounts[i].score += total;//increment the score epending on how fast the answer was selected
                } else if (data == "wrong") {//if the anser is wrong
                    accounts[i].score -= 100;
                }

                accounts[i].answered = true//the player has now answered the current question
            }
        }
        io.emit("newplayer", JSON.stringify(accounts))//refreshes the list of players and score

        nextQuestion();//calls for next question

    })
    console.log("for teting purposes the answer for the question is: " + questionnum[number].correct_answer)
    //for testing purposes
    let copywinner = [];//used to storre the winners
    function nextQuestion() {

        let store = [];
        for (let y = 0; y < accounts.length; y++) {
            store.push(accounts[y].answered)//stores the attribute answered of all players 
        }
        if (!store.includes(false)) {//if everyone has answered the question


            if (number < 4) {//while they still havent reached the end of the quiz
                number++;//increment to the next question


                for (var i = 0; i < accounts.length; i++) {

                    accounts[i].answered = false//set all players to not have answered the new question

                }

                io.emit("newplayer", JSON.stringify(accounts));//refreshes the players scores list
                timer2()//reset the timer
                io.emit("questioncall", JSON.stringify(questionnum[number]))//sends the question o client side



            } else if (number == questionnum.length - 1) {//once the round is done

                let winner;//store thee winner

                for (var i = -1; i < accounts.length - 1; i++) {
                    if (i = -1) {//used to be able to get the first player without messing up the forloop
                        i = 0;
                    }

                    if (accounts.length > 1) {//if theres more than one payer
                        if (accounts[i].score > accounts[i + 1].score) {//verify which has bigger score and stores it in the variable
                            winner = accounts[i].score;

                        } else if (accounts[i].score < accounts[i + 1].score) {
                            winner = accounts[i + 1].score;
                        } else {
                            winner = accounts[i].score;//if there happens to be a player with same score just store it for now

                        }
                    } else {//if theres only one player

                        winner = accounts[i].score;
                    }
                }

                for (var i = 0; i < accounts.length; i++) {
                    if (winner == accounts[i].score) {//checks once more but this time if there happens to be more than one winner 
                        copywinner.push(accounts[i].player);//store that player in array 
                    }


                }

                io.emit("winner", JSON.stringify(copywinner))//sends the player(s) to the client
                restart();//restart the round


            }
        }
    }
    function timer2() {//timer function
        count = 30;//set a timer of 30secs
        clearInterval(count2)//clear the timer if there was one previously running to prevent it from speeding up
        count2 = setInterval(timer, 1003)//timmer of a sec +3ms for lag purposes

        function timer() {
            count--;//decrease the timer variable after each seconds

            if (count <= 0) {//when the timer gets to 0
                clearInterval(count2)//stops and clears timer
                return;
            }
            io.emit('timer', count);//sends the timer to be displays
        }
    }
    function restart() {
        for (var i = 0; i < accounts.length; i++) {
            accounts[i].score = 0//resets scores of all players
            accounts[i].answered = false//resets the attribute to all players have not yet answered

        }
        number = 0;//reset the question number
        copywinner = [];//reset the winer
        io.emit("questioncall", JSON.stringify(questionnum[number]))//generate the  new question
        timer2();//start the timer
        io.emit("newplayer", JSON.stringify(accounts));    //refresh the list of players

    }






})