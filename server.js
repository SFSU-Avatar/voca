
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
  // let objFile1 = new fileTran.LocalFileData(`${path.join(__dirname)}/animation_output_textured/meshes/00000.obj`);

  let objFile1 = fs.readFileSync(`./animation_output_textured/meshes/00000.obj`, (err) => {
    if (err) {
      console.log("ERROR: " + err);
    }
  });

  let objFile2 = fs.readFileSync(`./animation_output_textured/meshes/00001.obj`, (err) => {
    if (err) {
      console.log("ERROR: " + err);
    }
  });

  console.log(objFile1);
  res.write("Message1");
  res.write("Message2");

  // res.writeHead(200, { 'Content-Type': 'application/json' });
  // res.write(JSON.stringify({ arrayBuffer: "objFile1", name: "myThing.obj", type: "model/obj" }));
  // res.write(JSON.stringify({ arrayBuffer: "objFile2", name: "myThing2.obj", type: "model/obj" }));
  // res.write(JSON.stringify(objFile2));
  res.end();

  // res.sendFile("animation_output_textured/meshes/00000.obj", options, (err) => {
  //   if (err) {
  //     console.log("ERROR: " + err);
  //   }
  // });
});

