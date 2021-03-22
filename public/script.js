const socket = io('/');
const videoGrid = document.getElementById('video-grid');

const canvas = document.createElement('canvas');
canvas.width = 640
canvas.height = 480
var ctx = canvas.getContext('2d')

const myVideo = document.createElement('video');
myVideo.width = 640;
myVideo.height = 480;

const myBackgroundlessVideo = document.createElement('video');
const videoSelect = document.querySelector('select#videoSource');

let counter = 0
let timeout = "false"
let backgroundRemovalMask;

var myId = null;
var callActive = false;
var retry = false;

const constraints = {
    audio: false,
    video: {deviceId: videoSource ? {exact: videoSource} : undefined}
};

const peers = {};

// Populate drop down selection with video devices
function gotDevices(deviceInfos) {
  for (let i = 0; i !== deviceInfos.length; ++i) {
    const deviceInfo = deviceInfos[i];
    const option = document.createElement('option');
    option.value = deviceInfo.deviceId;
if (deviceInfo.kind === 'videoinput') {
      option.text = deviceInfo.label || `camera ${videoSelect.length + 1}`;
      videoSelect.appendChild(option);
    } 
  }
  if (localStorage.getItem("someVarKey")) {
    videoSelect.value = localStorage.getItem("someVarKey")
  }


}

// Ask for camera permission and run gotDevices for all currently available video devices
navigator.mediaDevices.getUserMedia(constraints)
    .then(function(stream) {
        navigator.mediaDevices.enumerateDevices().then(gotDevices).catch(handleError);
        myVideo.srcObject = null;
        stream.getTracks().forEach( (track) => {
            console.log("here");
            track.stop();
        });
    });



function handleError(error) {
  console.log('navigator.MediaDevices.getUserMedia error: ', error.message, error.name);
}


function start() {

    // Create new peer by querying peerjs server

    myPeer = new Peer(undefined, {
        host: 'vpe-peerjs-server.herokuapp.com',
        secure: 'true'
    })

    const videoSource = videoSelect.value;

    const constraints = {
        audio: false,
        video: {width: 640, height: 480, deviceId: videoSource ? {exact: videoSource} : undefined}
    };

    // On join room, notify server
    myPeer.on('open', function(id) {
        socket.emit('join-room', ROOM_ID, id);
        myId = id;
    })

    
    navigator.mediaDevices.getUserMedia(constraints)
    .then(function(stream) {
        removeBackground = document.getElementById("bgremove").checked;
        if (removeBackground) {
            backgroundRemovedStream = canvas.captureStream();
            removeBg();
            myVideo.srcObject = stream;
            myVideo.addEventListener('loadedmetadata', () => {
            myVideo.play();
            addVideoStream(myBackgroundlessVideo, backgroundRemovedStream);})
            myBackgroundlessVideo.addEventListener('loadedmetadata', () => {
                update()
                ;})
            } else {
            addVideoStream(myVideo, stream)
        }

        
        // on user receiving call from other users
        myPeer.on('call', function(call) {
            if (removeBackground) {
                call.answer(backgroundRemovedStream)
            } else {
                call.answer(stream)
            }
            
            const video = document.createElement('video');

            // on recieving stream from new connected user
            call.on('stream', function(userVideoStream) {
                addVideoStream(video, userVideoStream);
            })

            // on call with user ending
            call.on('close', () => {
                // maybe do something
            })
        })


        // On new user connecting to room
        socket.on('user-connected', function(userId) {
            // Call new user
            if (removeBackground) {
                callNewUser(userId, backgroundRemovedStream)
            } else {
                callNewUser(userId, stream)
            }
        })
        
        // On new user disconnecting from room
        socket.on('user-disconnected', function(userId) {
            if(peers[userId]) peers[userId].close();
        }) 
    })

   
}

function end() {
    myPeer.destroy();
    location.reload();
}


// auxillary functions

function callNewUser(userId, stream) {
    answered = false;
    const video = document.createElement('video')
    const call = myPeer.call(userId, stream)

    call.on('stream', function(userVideoStream) {
        answered = true;
        addVideoStream(video, userVideoStream);
    })
    call.on('close', () => {
        //video.remove();
    })

    peers[userId] = call;


    setTimeout(function() {   
    if (answered == false) {  
        call.close();    
        counter++
        if (counter >= 5) {
            // Reload page for user with connection failed message
            localStorage.setItem("errorOccured", "true");
            location.reload()
        }    
        callNewUser(userId, stream);            
    } }, 2000);
}


function addVideoStream(video, stream) {
    video.srcObject = stream;
    video.addEventListener('loadedmetadata', () => {
        video.play();
    })
    videoGrid.append(video);
}

// Save selected webcam and reload page
function Refresh() {
    if (callActive == true) {
        myPeer.destroy();
        var someVarName = videoSelect.value;
        localStorage.setItem("someVarKey", someVarName);
        location.reload()
        videoSelect.value = localStorage.getItem("someVarKey");
    }
}

// If user tries to change camera while in a call
videoSelect.onchange = Refresh;

//start()



function joinCall(button) {
    start()
    document.getElementById("joinButton").disabled = true;
    document.getElementById("leaveButton").disabled = false;
    callActive = true;
}

function leaveCall() {
    Refresh();
}

async function removeBg() {

    // Load bodypix model to client machine
    const net = await bodyPix.load({
        architecture: 'MobileNetV1',
        outputStride: 16,
        multiplier: 1,
        quantBytes: 2
    });

    
    setInterval(function () { createFrame(net) }, 120);
}

async function createFrame(net) {

    const segmentation = await net.segmentPerson(myVideo, {
        flipHorizontal: false,
        internalResolution: 'high',
        segmentationThreshold: 0.5
    });

    const foregroundColor = { r: 0, g: 0, b: 0, a: 255 };
    const backgroundColor = { r: 0, g: 0, b: 0, a: 0 };
    backgroundRemovalMask = bodyPix.toMask(segmentation, foregroundColor, backgroundColor, false);

    if (!backgroundRemovalMask) return;

    ctx.globalCompositeOperation = 'destination-over';
    ctx.putImageData(backgroundRemovalMask, 0, 0);
  
    ctx.globalCompositeOperation = 'source-in';
    ctx.drawImage(myVideo, 0, 0, 640, 480);

    ctx.globalCompositeOperation = 'destination-atop'
    ctx.fillStyle = "green";
    ctx.fillRect(0, 0, 640, 480);    

}

// Ensure camera fps independent from speed of new background removal mask
function update(){
  ctx.globalCompositeOperation = 'destination-over';
  ctx.putImageData(backgroundRemovalMask, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.drawImage(myVideo, 0, 0, 640, 480); 
  ctx.globalCompositeOperation = 'destination-atop'
  ctx.fillStyle = "green";
  ctx.fillRect(0, 0, 640, 480);    
  window.requestAnimationFrame(update);
  
  }

// Initialisation
document.getElementById("leaveButton").disabled = true;

if (localStorage.getItem("errorOccured") == "true") {
    alert("Sorry! A connection error occured, please rejoin the call.");
    localStorage.setItem("errorOccured", "false");
}

