
const path = require("path");
const express = require('express');
const expressFileUpload = require("express-fileupload");
const app = express();
const port = process.env.PORT || 5000;

app.use(expressFileUpload());

//Stuff for deployment
app.use(express.static(path.join(__dirname, "build")));

if (process.env.NODE_ENV === 'production') {
  app.get('/*', function (req, res) {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
  });
}

// This displays message that the server running and listening to specified port
app.listen(port, () => console.log(`Listening on port ${port}`));

app.get("/api", (req, res) => {
  res.send({ message: "Hello from server!" });
});

app.post('/upload', function (req, res) {
  console.log(req.files.uploadedFile); // the uploaded file object
  let file = req.files.uploadedFile;

  file.mv(`../audio/${file.name}`, (err) => {
    if (err) {
      console.log("ERROR: " + err);
    }
  });

  res.send({ message: `File ${file.name} was uploaded.` });
  // res.sendFile("../audio/tts.mp3");

});