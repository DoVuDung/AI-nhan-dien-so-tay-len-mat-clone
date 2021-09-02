import React, { useEffect, useRef, useState } from 'react';
import * as mobilenet from '@tensorflow-models/mobilenet'
import * as knnClassifier from '@tensorflow-models/knn-classifier'
import '@tensorflow/tfjs-backend-cpu'//fix error no backend init
import * as tf from '@tensorflow/tfjs'//fix eror: Unhandled Rejection (TypeError): t.flatten is not a function
import { Howl } from 'howler'
import { initNotifications, notify } from '@mycv/f8-notification';
import './App.css';
import soundURL from './assets/hey_sondn.mp3'
var sound = new Howl({
  src: [soundURL]
});


const NOT_TOUCH_LABEL = 'not_touch'
const TOUCHED_LABEL = 'touched'
const TRAINING_TIMES = 50
const TOUCH_CONFIDENCE = 0.8

function App() {
  //lưu kiểu instance, có hai cách sử dụng với useRef, lưu trữ dạng DOM và lưu trữ dạng biến
  const video = useRef()
  const classifier = useRef()
  const canPlayAudio = useRef(true)
  const model = useRef()
  const [touched, setTouched] = useState(false)

  
/**
 * Bước 1: Train cho máy khuôn mặt không chạm tay lên mặt
 * Bước 2: Train cho máy khuôn mặt có chạm tay
 * Bước 3: Lấy hình ảnh hiện tại phân tích và so sánh với data đã học
 * ==> Nếu mà nó matching với data khuôn mặt chạm tay => cảnh báo
 * @param {*} label 
 */

// gán nhãn dữ liệu là không chạm tay lên mặt và chạm tay lên mặt
  const train = async label => {
    console.log(label)
    console.log(`[${label}] Đang train cho máy mặt đẹp trai của bạn...`)
    //chuẩn bị training cho máy học
    for(let i = 0; i < TRAINING_TIMES; i++){
      console.log(`Progress ${Math.round((i+1)/TRAINING_TIMES*100,0)}%`)
      //await sleep(100)
      await training(label)
    }
  }

  //function training
  const training = label => {
    return new Promise(async (resolve) => {
      //đẩy hình ảnh, video vào trong current
      const embedding = model.current.infer(
        // img: tf.Tensor3D | ImageData | HTMLImageElement |
        //     HTMLCanvasElement | HTMLVideoElement,
        // embedding = false
        video.current,
        true
      )
      classifier.current.addExample(embedding, label)
      //cho máy train trong 100 ms
      await sleep(100)
      resolve()
    })
  }

  const run = async () => {
    //lấy luồng phân tích từ mobilenet
    const embedding = model.current.infer(
      video.current,
      true
    )

    //Making a prediction
    const result = await classifier.current.predictClass(embedding) 
    //console.log('Label: ' + result.label)
    //console.log('Confidents: ' +result.confidents)
    // Promise<{label: string, classIndex: number, confidences: {[classId: number]: number}}>;
    //console.log(result)
    if(result.label === TOUCHED_LABEL &&
      result.confidences[result.label] > TOUCH_CONFIDENCE){
        console.log('Touched')
        if(canPlayAudio.current === true){
          canPlayAudio.current = false
          sound.play();
        }
        notify('Bỏ tay ra', {body:'bạn vừa chạm tay vào mặt'})
        setTouched(true)
    }else{
      console.log('Not touched')
      setTouched(false)

    }

    //hàm trên chỉ kiểm tra 1 lần
    //chúng ta cần chạy lại hàm run để đảm bảo hàm được run liên tục
    await sleep(200)
    run()
  }

  const sleep = (ms=0)=>{
    //khi setTimeout tới một điểm nhất định thì sẽ trả về cái promise bên dưới 
    //promise chấp nhận đối số
    //promise nên có thể await trong vòng for được
    return new Promise((resolve => setTimeout(resolve,ms)))
  }


  //set up camera
  const init = async () => {
    console.log('init...')
    await setupCamera()
    console.log('set up camera success')
    // Create the classifier.
    classifier.current = knnClassifier.create();
    // Load the model.
    model.current = await mobilenet.load();
    console.log('setup done')
    console.log('Khong cham tay len mat va bam train 1')

    initNotifications({ cooldown: 3000 })

  }

  const setupCamera = () => {
    return new Promise((resolve, reject) => {
      //xin quyen truy cap vao camera
      navigator.getUserMedia = navigator.getUserMedia ||
        navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia ||
        navigator.msGetUserMedia

      if (navigator.getUserMedia) {
        navigator.getUserMedia(
          { video: true },
          //day luong stream vao video 
          stream => {
            video.current.srcObject = stream
            video.current.addEventListener('loadeddata', resolve)
          },
          error => reject(error)
        )
      } else {
        reject()
      }
    })
  }

  useEffect(() => {
    init()

    // Fires when the sound finishes playing.
  sound.on('end', function(){
    canPlayAudio.current = true
  });
    //cleanup
    return () => { }//tương đương với component willUnMount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])//nếu call lại mảng rổng sẽ tương đương call lại với component didMount




  return (
    <div className={`main ${touched ? 'touch':''}`}>
      {/* khi mà video được mount thì nó sẽ được set Dom ref, instance của thằng video */}
      <video ref={video} className="video" autoPlay />
      <div className="control">
        <button className="btn" onClick={() =>train(NOT_TOUCH_LABEL)}>Train 1</button>
        <button className="btn" onClick={() =>train(TOUCHED_LABEL)}>Train 2</button>
        <button className="btn" onClick={() =>run()}>Run</button>
      </div>
    </div>
  );
}

export default App;
