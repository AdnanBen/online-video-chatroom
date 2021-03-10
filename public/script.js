const socket = io('/');
const videoGrid = document.getElementById('video-grid');


const myVideo = document.createElement('video');
const peers = {};

var myId = null;

var n = false;
var retry = false;

const videoSelect = document.querySelector('select#videoSource');

const sleep = (milliseconds) => {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
  }



function gotDevices(deviceInfos) {
    console.log("Startf");
  for (let i = 0; i !== deviceInfos.length; ++i) {
    const deviceInfo = deviceInfos[i];
    const option = document.createElement('option');
    option.value = deviceInfo.deviceId;
if (deviceInfo.kind === 'videoinput') {
      option.text = deviceInfo.label || `camera ${videoSelect.length + 1}`;
      videoSelect.appendChild(option);
      console.log("added");
    } 
  }
  if (localStorage.getItem("someVarKey")) {
    videoSelect.value = localStorage.getItem("someVarKey")
  }


}

navigator.mediaDevices.enumerateDevices().then(gotDevices).catch(handleError);

function handleError(error) {
  console.log('navigator.MediaDevices.getUserMedia error: ', error.message, error.name);
}

//videoSelect.value = localStorage.getItem("someVarKey");


function start() {

    //document.getElementById(demo).disabled = 'true'

    myPeer = new Peer(undefined, {
        host: 'presentr-peerjs-server.herokuapp.com',
        secure: 'true'
    })


    const videoSource = videoSelect.value;

    const constraints = {
        audio: false,
        video: {deviceId: videoSource ? {exact: videoSource} : undefined}
    };

    myPeer.on('open', function(id) {
        socket.emit('join-room', ROOM_ID, id);
        myId = id;
        console.log("peer open here " + id);
    })

    navigator.mediaDevices.getUserMedia(constraints)
    .then(function(stream) {
        console.log('Got stream with constraints:', constraints);
        console.log(videoSource);
        console.log("TEST");
        addVideoStream(myVideo, stream)
        //const video = document.createElement('video');
         
         
        myPeer.on('call', function(call) {
            call.answer(stream);
            console.log("answered");
            
            const video = document.createElement('video');
            call.on('stream', function(userVideoStream) {
                console.log("added");
                addVideoStream(video, userVideoStream);
            })
            call.on('close', () => {
                console.log("close");
                //video.remove();
            })
        })

        myPeer.on('connection', function(conn) { 
            console.log("Here maybe?");
            conn.on('open', function() {
                console.log("Here miracly?");
                // Receive messages
                conn.on('data', function(data) {
                  console.log("but miracly?");
                  console.log('Received', data);
                });
              
                // Send messages
                conn.send('Hello!');
              });
         });

        socket.on('user-connected', function(userId) {
            console.log("Received connection from " + userId);
            var conn = myPeer.connect(userId);
            conn.on('open', function() {
                conn.send(myId);
              });
            console.log("user connected" + userId);
            connectToNewUser(userId, stream)
        })
        
        socket.on('user-disconnected', function(userId) {
            console.log("here");
            if(peers[userId]) peers[userId].close();
            //video.remove();
        }) 

    
    })

  
   
}

function end() {
    myPeer.destroy();
    location.reload();
}


// auxillary functions

function connectToNewUser(userId, stream) {
    answered = false;
    const call = myPeer.call(userId, stream)
    const video = document.createElement('video')
    console.log("connectonewuser");
    console.log("CALL ID " + userId);
    call.on('stream', function(userVideoStream) {
        answered = true;
        console.log("stream started? " + userId);
        addVideoStream(video, userVideoStream);
    })
    call.on('close', () => {
        //video.remove();
    })

    peers[userId] = call;

    setTimeout(function() {   
    if (answered == false) {          
        connectToNewUser(userId, stream);            
    } }, 1000);
}


function addVideoStream(video, stream) {
    video.srcObject = stream;
    video.addEventListener('loadedmetadata', () => {
        video.play();
    })
    videoGrid.append(video);
    console.log("appended");
}

function Refresh() {
    if (n == true) {
        myPeer.destroy();
        var someVarName = videoSelect.value;
        localStorage.setItem("someVarKey", someVarName);
        location.reload()
        videoSelect.value = localStorage.getItem("someVarKey");
    }
}

videoSelect.onchange = Refresh;

//start()



function myFunction(button) {
    start()
    document.getElementById("myBtn").disabled = true;
    console.log("here22");
    n = true;
}

function myFunction2() {
    Refresh()
}

