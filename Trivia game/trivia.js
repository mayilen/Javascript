
function init() {
    let buttonjoin = document.getElementById("join")
    buttonjoin.onclick = join;//set function to the join button 
}
let socket = null;
function join() {

    let txt = document.getElementById("name");//get the name texbox
    let name = txt.value;//store the name in variable
    if (name.length > 0) {//if there is a name entered
        if (socket == null) {
            socket = io();
            socket.on("left", playerleft)//refers t when a player leaving
            socket.on("questioncall", questionq)//used to get the question
            socket.on("newPerson", adduser);//used for when theres a new player for the chat
            socket.on("newmsg", newMessage)//new message 
            socket.on("init", initmsg);//initalizes all messages
            socket.on("winner", winner);//display winner
            socket.on("newplayer", newp);//generate list of players
            socket.emit("register", name);//when new player joins
            socket.on('timer', timer)//returns timer to server side
            socket.on('disable', hint)//used to give a hint
        }
        document.getElementById("load").setAttribute("style", "visibility:hidden ")//hide the texbox and button for joining
        document.getElementById("form3").setAttribute("style", "visibility:visible ")//chat textbox

    } else {
        alert("you need a name");
    }
}
function sendMessage() {//sending a message in chat

    let msg = document.getElementById("message").value//the message entered
    if (msg.length > 0) {
        document.getElementById("message").value = "";//clear the textbox
        socket.emit("newmsg", msg);//emit the msg to the server

    }

}
function playerleft(data) {//msg for when the player leaves
    let text = data + " left the chat"
    newMessage(text)//generate the message
}
function adduser(name) {//display message of player joining

    let text = name + " joined the chat"
    newMessage(text)
}
function initmsg(data) {//initialize all messages 
    let msg = JSON.parse(data).displaymsg;
    msg.forEach(elem => {
        newMessage(elem);//generate all messages
    })
}
function newMessage(data) {

    let Li = document.createElement("li")
    let text = document.createTextNode(data);
    Li.appendChild(text);
    document.getElementById("displaymsg").appendChild(Li)//append to list element
}
function hint(data) {
    let radio = document.getElementsByClassName('name')
    let lbl = document.getElementsByClassName('lbl')
    for (let i = 0; i < radio.length; i++) {
        if (JSON.parse(data) == radio[i].value) {
            radio[i].disabled = 'true';//remove one of the wrong answers
            radio[i].setAttribute("Style", "visibility:hidden")
            lbl[i].disabled = 'true';
            lbl[i].setAttribute("Style", "visibility:hidden")
        }
    }
}
let time;//used to store timer
function timer(data) {
    time = data;
    let div = document.getElementById("timer");
    div.innerHTML = data;//display the countdown
    socket.emit("calc", data);//return the time to the server
    if (data == 1) {
        socket.emit("scoreIncrease", "wrong");//if timer runs out the player loses 100 points
    }
}

function winner(data) {//to display the winner 
    let a = JSON.parse(data);
    let result = "";//stores the names of the winners

    a.forEach(element => {

        result += element;
        result += '\n '
    });

    alert('winner(s): ' + result);

}
function questionq(data) {

    let question = JSON.parse(data);//get the question

    questiongen(question);//generates the question

}
function questiongen(data) {


    let div = document.getElementById('questionload');
    div.innerHTML = "";//clear the previous question
    let div2 = document.createElement('div')

    let text = document.createElement('label');
    let increment = 0;
    text.innerHTML = data.question;
    div2.appendChild(text);//display the question 

    let radiodiv = document.createElement('div');
    let radionums = [];//store the index of answers used for randominsing answers position
    let form = document.createElement('form')
    form.name = "form"
    let array = data.incorrect_answers.concat(data.correct_answer);//store the incorrect and correct answers in a array
    console.log("for teting purposes the answer for the question is: " + data.correct_answer)
    //to test code and know which answers are correct
    while (radionums.length < array.length) {
        let rand = Math.floor(Math.random() * array.length);
        if (!radionums.includes(rand)) {///if the the answer has not yet been displayed
            let radio = document.createElement('input');
            radio.type = 'radio'
            radio.id = "id" + increment
            radio.name = "name"

            radio.className = "name"
            radio.value = array[rand];

            let label = document.createElement('label');
            label.htmlFor = "id" + incrememnt;
            label.className = 'lbl'
            label.appendChild(radio);
            label.innerHTML = array[rand];//sets the label to the answer text from for the question 
            form.appendChild(radio);
            form.appendChild(label);
            form.innerHTML += '</br>'
            increment++;
            radionums.push(rand);//store the questio index to prevent duplication 

        }
    }




    radiodiv.appendChild(form)
    div.appendChild(div2);
    div.appendChild(radiodiv)
    let rad = document.getElementsByClassName("name");
    for (let i = 0; i < rad.length; i++) {
        rad[i].onclick = function () {//set a function to all radio buttons 

            value = rad[i].value//store the answer in variable
            if (data.correct_answer.includes(value)) {//if the chosen answer is correct 

                socket.emit("scoreIncrease", "correct");//increase the score on server side that its correct
            } else {
                socket.emit("scoreIncrease", "wrong");//decrease the score on server side since its wrong 
            }

            var rad2 = document.getElementsByClassName("name");
            for (let x = 0; x < rad2.length; x++) {
                rad2[x].disabled = 'true'//prevent the user to change answers
            }


        }
    }
}
let value;


function newp(data) {//gets all players
    let form2 = document.getElementById("form2");
    form2.innerHTML = "";//clears any previous display
    let msg = JSON.parse(data)

    for (let i = 0; i < msg.length; i++) {

        pgenerate(msg[i]);
        //generate the list of players and their score
    }


}
let incrememnt = 0;
function pgenerate(msg) {//generate player

    let f = document.getElementById('form1');
    let form2 = document.getElementById("form2");

    let lblp = document.createElement('label')
    if (msg.answered == false) {
        lblp.setAttribute("style", "color:red")//when playre has not yet answered
    } else {
        lblp.setAttribute("style", "color:green")//once answered
    }
    lblp.name = 'name' + incrememnt;
    lblp.id = "id"
    lblp.className = 'players'
    lblp.innerHTML = msg.player + "  |   " + msg.score;//display name and score

    f.setAttribute("style", "visibility :visible")
    form2.appendChild(lblp);
    let div4 = document.createElement('div');
    div4.appendChild(lblp);

    form2.appendChild(div4);


}

