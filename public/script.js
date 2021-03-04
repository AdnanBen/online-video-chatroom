const socket = io('/');
const videoGrid = document.getElementById('video-grid');
const myPeer = new Peer(undefined, {
    host: '/',
    port: '3001'
})

const myVideo = document.createElement('video');
const peers = {};

navigator.mediaDevices.getUserMedia({video: true,audio: false})
.then(function(stream) {
    addVideoStream(myVideo, stream)

    myPeer.on('call', function(call) {
        call.answer(stream);
        
        const video = document.createElement('video');
        call.on('stream', userVideoStream => {
            addVideoStream(video, userVideoStream);
        })
    })

    socket.on('user-connected', function(userId) {
        connectToNewUser(userId, stream)
    })
})

socket.on('user-disconnected', function(userId) {
    if(peers[userId]) peers[userId].close();
}) 

myPeer.on('open', function(id) {
    socket.emit('join-room', ROOM_ID, id);
})


function connectToNewUser(userId, stream) {
    const call = myPeer.call(userId, stream)
    const video = document.createElement('video')
    call.on('stream', function(userVideoStream) {
        addVideoStream(video, userVideoStream);
    })
    call.on('close', () => {
        video.remove();
    })

    peers[userId] = call;
}

function addVideoStream(video, stream) {
    video.srcObject = stream;
    video.addEventListener('loadedmetadata', () => {
        video.play();
    })
    videoGrid.append(video);
}