const socket = io('/');
const videoGrid = document.getElementById('video-grid');

const canvas = document.createElement('canvas');
canvas.width = 640
canvas.height = 480
const video2 = document.getElementById('video2');
let backgroundDarkeningMask;

const myVideo = document.createElement('video');
const myVideo2 = document.createElement('video');
myVideo.width = 640;
myVideo.height = 480;




const peers = {};

var myId = null;

var n = false;
var retry = false;

const videoSelect = document.querySelector('select#videoSource');



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

var ctx = canvas.getContext('2d');

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
        removeBackground = document.getElementById("bgremove").checked;
        console.log('Got stream with constraints:', constraints);
        console.log(videoSource);
        console.log("TEST");

  
        //addVideoStream(myVideo, stream)
        //addVideoStream(myVideo2, stream2)
        //const video = document.createElement('video');

        if (removeBackground) {
            stream2 = canvas.captureStream();
            setInterval(removeBg, 100); 
            myVideo.srcObject = stream;
            myVideo.addEventListener('loadedmetadata', () => {
            myVideo.play();
            addVideoStream(myVideo2, stream2);})
            } else {
            addVideoStream(myVideo, stream)
        }

         
        myPeer.on('call', function(call) {
            if (removeBackground) {
                call.answer(stream2)
                console.log("this one");
            } else {
                call.answer(stream)
                console.log("there one");
            }
            //call.answer(stream);
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


        socket.on('user-connected', function(userId) {
            console.log("Received connection from " + userId);
            console.log("user connected" + userId);
            if (removeBackground) {
                connectToNewUser(userId, stream2)
            } else {
                connectToNewUser(userId, stream)
            }
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
    } }, 5000);
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

async function removeBg() {
    //  ? Loading BodyPix w/ various parameters
    const net = await bodyPix.load({
        architecture: 'MobileNetV1',
        outputStride: 16,
        multiplier: 0.5,
        quantBytes: 4
    });

    // ? Segmentation occurs here, taking video frames as the input
    const segmentation = await net.segmentPerson(myVideo, {
        flipHorizontal: false,
        internalResolution: 'medium',
        segmentationThreshold: 0.5
    });

    // Convert the segmentation into a mask to darken the background.
    const foregroundColor = { r: 0, g: 0, b: 0, a: 255 };
    const backgroundColor = { r: 0, g: 0, b: 0, a: 0 };
    backgroundDarkeningMask = bodyPix.toMask(segmentation, foregroundColor, backgroundColor, false);
    compositeFrame(backgroundDarkeningMask);
}

async function compositeFrame(backgroundDarkeningMask) {
    //video2.srcObject = canvas.captureStream();
    if (!backgroundDarkeningMask) return;
    // grab canvas holding the bg image
    //var ctx = canvas.getContext('2d');
    // composite the segmentation mask on top
    
    ctx.globalCompositeOperation = 'destination-over';
    ctx.putImageData(backgroundDarkeningMask, 0, 0);
    // composite the video frame

    
    ctx.globalCompositeOperation = 'source-in';


    ctx.drawImage(myVideo, 0, 0, 640, 480);

    ctx.globalCompositeOperation = 'destination-atop'
    ctx.fillStyle = "green";
    ctx.fillRect(0, 0, 640, 480);    


    //video2.srcObject = canvas.captureStream();
}

function update(){
  ctx.globalCompositeOperation = 'destination-over';
  ctx.putImageData(backgroundDarkeningMask, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.drawImage(video, 0, 0, 640, 480); 
  ctx.globalCompositeOperation = 'destination-atop'
  ctx.fillStyle = "green";ctx.fillRect(0, 0, 640, 480);    
  requestAnimationFrame(update);
  
  }
