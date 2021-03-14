
// ! Source to stream from
const video = document.getElementById('video');
// ! Destination to stream to
const canvas = document.createElement('canvas');
canvas.width = 640;
canvas.height = 480;
const video2 = document.getElementById('video2');
let backgroundDarkeningMask;

//video2.srcObject = canvas.captureStream();



var ctx = canvas.getContext('2d');
// ! Video Streaming using getUserMedia
if (navigator.mediaDevices) {
    navigator.mediaDevices
        .getUserMedia({ video: { facingMode: "environment" } })
        .then(stream => {
            video.srcObject = stream;
            video2.srcObject = canvas.captureStream();
            video2.addEventListener('loadeddata', function() {
                video.play();  // start playing
                update(); //Start rendering
              })
        

            //video.hidden = true;
            setInterval(removeBg, 100); // * Call the segmenting fu
            // removeBg();
            
        });
}

// ! Loading bodyPix


async function removeBg() {
    //  ? Loading BodyPix w/ various parameters
    const net = await bodyPix.load({
        architecture: 'MobileNetV1',
        outputStride: 16,
        multiplier: 0.5,
        quantBytes: 4
    });

    // ? Segmentation occurs here, taking video frames as the input
    const segmentation = await net.segmentPerson(video, {
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


    ctx.drawImage(video, 0, 0, 640, 480);

    ctx.globalCompositeOperation = 'destination-atop'
    ctx.fillStyle = "green";
    ctx.fillRect(0, 0, 640, 480);    

    console.log("here2");

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

