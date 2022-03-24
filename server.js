
const path = require("path");
const express = require('express');
const expressFileUpload = require("express-fileupload");
const { write } = require("fs");
const app = express();
const port = process.env.PORT || 5000;
const fielTran = require("get-file-object-from-local-path");

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

  let objFile1 = new fielTran.LocalFileData(`${path.join(__dirname)}/animation_output_textured/meshes/00000.obj`,);
  let objFile2 = new fielTran.LocalFileData(`${path.join(__dirname)}/animation_output_textured/meshes/00001.obj`);
  console.log(objFile1);
  // res.send(objFile1);

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.write(JSON.stringify(objFile1));
  res.end();

  // res.sendFile("animation_output_textured/meshes/00000.obj", options, (err) => {
  //   if (err) {
  //     console.log("ERROR: " + err);
  //   }
  // });

});