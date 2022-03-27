
const path = require("path");
const express = require('express');
const expressFileUpload = require("express-fileupload");
const { write } = require("fs");
const http = require('http');
const app = express();
const port = process.env.PORT || 5000;
const fileTran = require("get-file-object-from-local-path");
const fs = require("fs");

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

app.post('/upload', (req, res) => {
  let file = req.files.uploadedFile;

  file.mv(`audio/${file.name}`, (err) => {
    if (err) {
      console.log("ERROR: " + err);
    }
  });

  res.send({ message: `File ${file.name} was uploaded.` });
});

app.get('/getFiles', (req, res) => {
  /////////////////////////////// INSTRUCTIONS ////////////////////////////////
  // When a request is made to "/getFiles" a connection is opened and we
  // begin stereaming data to the frontend. We will want to stream all of
  // the obj files in response to a single request so all files will need
  // to be sent before res.end() is called which closes the connection.
  //
  // STEPS OF THE PROCESS
  //
  // 1. Get a file's contents
  // 2. Stream that file's data to the frontend using res.write()
  // 3. Follow each sent file with a delimeter, we are using the "$" character
  // 4. Close the connection after all files have been streamed by calling res.end()
  //
  // An example of streaming 2 files is demonstrated below. Use this as a guide to
  // incorporate the file streaming process into the function generating obj files.
  //

  //Store the file data of the first file into an object
  let objFile1 = fs.readFileSync(`./animation_output_textured/meshes/00000.obj`, (err) => {
    if (err) {
      console.log("ERROR: " + err);
    }
  });

  //Stream first file's data to frontend
  // arrayBuffer - The file data that was read into an object
  // name - the name of the file (can be programatically determiend similar 
  //        to how it is done in output_sequence_meshes)
  // type - The file type, in our case "model/obj"
  res.write(JSON.stringify({ arrayBuffer: objFile1, name: "File1.obj", type: "model/obj" }));
  res.write("$");

  //Store the file data of the second file into an object
  let objFile2 = fs.readFileSync(`./animation_output_textured/meshes/00001.obj`, (err) => {
    if (err) {
      console.log("ERROR: " + err);
    }
  });

  //Stream second file's data to frontend
  res.write(JSON.stringify({ arrayBuffer: objFile2, name: "File2.obj", type: "model/obj" }));
  res.write("$");

  console.log("\n[Data Sent]\n");

  //Close the connection after all files are sent
  res.end();
});
