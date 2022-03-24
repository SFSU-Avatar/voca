
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

  file.mv(`audio/${file.name}`, (err) => {
    if (err) {
      console.log("ERROR: " + err);
    }
  });

  //TO-DO: Create a file object for each obj
  //Send that file object using res.write so that we can send multiple
  //call res.end when done
  //Frontend will recieve as data blob

  // res.send({ message: `File ${file.name} was uploaded.` });
  var options = {
    root: path.join(__dirname)
  }
  res.sendFile("server.js", options, (err) => {
    if (err) {
      console.log("ERROR: " + err);
    }
  });

});