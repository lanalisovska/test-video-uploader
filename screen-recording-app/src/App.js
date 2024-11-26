import React, { useState, useRef } from 'react';
import axios from 'axios';

const App = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showLatestVideo, setShowLatestVideo] = useState(false);
  const [latestVideoUrl, setLatestVideoUrl] = useState(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'video/webm',
      });

      mediaRecorderRef.current.ondataavailable = (event) => {
        recordedChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const videoBlob = new Blob(recordedChunksRef.current, {
          type: 'video/webm',
        });
        const videoUrl = URL.createObjectURL(videoBlob);
        setVideoUrl(videoUrl);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing screen media:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const uploadVideo = async () => {
    if (uploading) return;
    setUploading(true);

    const videoBlob = new Blob(recordedChunksRef.current, {
      type: 'video/webm',
    });

    const formData = new FormData();
    formData.append('file', videoBlob, 'recording.webm');

    try {
      const response = await axios.post('http://localhost:5000/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      alert('Video uploaded successfully!');
    } catch (error) {
      console.error('Error uploading video:', error);
      alert('Failed to upload video.');
    } finally {
      setUploading(false);
    }
  };

  const fetchAndStreamVideo = async () => {
    try {
      const response = await axios.get('http://localhost:5000/get-latest-video', {
        responseType: 'blob',
      });
  
      const videoBlob = response.data;
  
      const videoUrl = URL.createObjectURL(videoBlob);
      setLatestVideoUrl(videoUrl);
      setShowLatestVideo(true);
  
      const mediaSource = new MediaSource();
      const videoElement = document.createElement('video');
      videoElement.src = URL.createObjectURL(mediaSource);
      videoElement.controls = true;
  
      document.body.appendChild(videoElement);
  
      mediaSource.addEventListener('sourceopen', () => {
        const sourceBuffer = mediaSource.addSourceBuffer('video/webm; codecs="vp8, vorbis"');
        const chunkSize = 1024 * 1024;
        let start = 0;
        const reader = new FileReader();
  
        reader.onload = function(event) {
          if (event.target && event.target.result) {
            sourceBuffer.appendBuffer(event.target.result);
            start += chunkSize;
  
            if (start < videoBlob.size) {
              readNextChunk();
            }
          }
        };
  
        const readNextChunk = () => {
          const chunk = videoBlob.slice(start, start + chunkSize);
          reader.readAsArrayBuffer(chunk);
        };
  
        readNextChunk();
      });
  
      videoElement.play();
    } catch (error) {
      console.error('Error fetching video for streaming:', error);
      alert('Failed to fetch the latest video.');
    }
  };
  
  

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const uploadFile = async () => {
    if (uploading || !selectedFile) return;
    setUploading(true);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await axios.post('http://localhost:5000/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      alert('File uploaded successfully!');
      setSelectedFile(null);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="App">
      <h1>Screen Recording App</h1>

      <button onClick={isRecording ? stopRecording : startRecording}>
        {isRecording ? 'Stop Recording' : 'Start Recording'}
      </button>

      {videoUrl && (
        <>
          <video controls src={videoUrl} width="400" />
          <button onClick={uploadVideo} disabled={uploading}>
            {uploading ? 'Uploading...' : 'Upload Video'}
          </button>
        </>
      )}

      <button onClick={fetchAndStreamVideo}>Get Latest Video</button>

      {showLatestVideo && latestVideoUrl && (
        <div>
          <h2>Latest Video from Server</h2>
          <video controls src={latestVideoUrl} width="600" />
        </div>
      )}

      <div>
        <h2>Upload Video from Your Computer</h2>
        <input
          type="file"
          accept="video/*"
          onChange={handleFileChange}
        />
        <button onClick={uploadFile} disabled={uploading || !selectedFile}>
          {uploading ? 'Uploading...' : 'Upload Selected Video'}
        </button>
      </div>
    </div>
  );
};

export default App;
