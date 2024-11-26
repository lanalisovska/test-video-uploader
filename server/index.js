const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

if (!fs.existsSync('./uploads')) {
  fs.mkdirSync('./uploads');
}

app.post('/upload', upload.single('file'), (req, res) => {
  console.log('File received:', req.file);
  res.send({ message: 'File uploaded successfully!', file: req.file });
});

app.get('/get-latest-video', (req, res) => {
    fs.readdir('./uploads', (err, files) => {
      if (err) {
        return res.status(500).json({ error: 'Unable to read uploads directory' });
      }
      const latestFile = files
        .map(file => ({ file, time: fs.statSync(path.join('./uploads', file)).mtime }))
        .sort((a, b) => b.time - a.time)[0];
  
      if (!latestFile) {
        return res.status(404).json({ error: 'No videos found' });
      }
  

      const videoPath = path.join(__dirname, 'uploads', latestFile.file);
      serveVideo(videoPath, req, res);
    });
  });
  
  const serveVideo = (videoPath, req, res) => {
    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;
  
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
  
      if (start >= fileSize) {
        return res.status(416).send("Requested range not satisfiable");
      }
  
      const chunkSize = (end - start) + 1;
      const fileStream = fs.createReadStream(videoPath, { start, end });
  
      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize,
        "Content-Type": "video/webm",
      });
  
      fileStream.pipe(res);
    } else {
      res.writeHead(200, {
        "Content-Length": fileSize,
        "Content-Type": "video/webm",
      });
  
      fs.createReadStream(videoPath).pipe(res);
    }
  };
  
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const port = 5000;
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
