
const path = require("path");
const express = require('express');
const expressFileUpload = require("express-fileupload");
const { write } = require("fs");
const http = require('http');
const app = express();
const port = process.env.PORT || 5000;
const fileTran = require("get-file-object-from-local-path");
const fs = require("fs");
const gtts = require('gtts');

const { spawn } = require("child_process");
const { TIMEOUT } = require("dns");

class Queue {
  constructor() {
    this.elements = {};
    this.head = 0;
    this.tail = 0;
  }
  enqueue(element) {
    this.elements[this.tail] = element;
    this.tail++;
  }
  dequeue() {
    const item = this.elements[this.head];
    delete this.elements[this.head];
    this.head++;
    return item;
  }
  peek() {
    return this.elements[this.head];
  }
  get length() {
    return this.tail - this.head;
  }
  get isEmpty() {
    return this.length === 0;
  }
}

var vocaText;

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

app.post('/uploadFile', (req, res) => {
  let file = req.files.uploadedFile;

  file.mv(`audio/userAudio.wav`, (err) => {
    if (err) {
      console.log("ERROR: " + err);
    }
  });

  vocaText = "no";
  res.send({ message: `File ${file.name} was uploaded.` });
});

app.post('/uploadText', (req, res) => {
  const userText = req.body.userText;
  console.log(userText);

  const speech = new gtts(userText, 'en');
  speech.save('./audio/userAudio.wav', (err, result) => {
    if (err) {
      console.log(`TTS failure: `);
      console.log(err);
    }

    vocaText = "yes";
    res.sendFile(`${__dirname}/audio/userAudio.wav`);

  });

});

app.get('/getFiles', (req, res) => {
  //Call VOCA
  const py = spawn("python", ["run_voca.py",
    "--tf_model_fname",
    "./model/gstep_52280.model",
    "--ds_fname",
    "./ds_graph/output_graph.pb",
    "--template_fname",
    "./template/FLAME_sample.ply",
    "--condition_idx",
    "3",
    "--uv_template_fname",
    "./template/texture_mesh.obj",
    "--texture_img_fname",
    "./template/texture_mesh.png",
    "--out_path",
    "./animation_output_textured",
    "--audio_fname",
    "./audio/userAudio.wav",
    "--text",
    vocaText
  ]);
  console.log(vocaText);
  //Output PID of python process
  console.log("PID: ", py.pid);

  res.writeHeader(200, {
    'Content-Type': 'model/obj'
  });

  var ok = true
  var objQueue = new Queue()

  //When OBJ files are ready
  py.stdout.on("data", async (msg) => {

    objQueue.enqueue(msg)

    while (!ok) {
      // console.log("WAITING FOR OK " + msg)
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    objName = String(objQueue.dequeue());
    var objList = objName.split(/(?<=[j])/g)

    for (var i = 0; i < objList.length; i++) {
      var name = objList[i];
      // console.log("Name in loop: " + name);

      var content = JSON.stringify({
        arrayBuffer: fs.readFileSync(`./animation_output_textured/meshes/${name}`, 'utf8', (err) => {
          if (err) {
            console.log("ERROR: " + err);
          }
        }), name: name, type: "model/obj"
      }) + "$"
      ok = res.write(content);

      if (!ok) {
        console.log("WAITING FOR DRAIN.... " + name);
        await new Promise(resolve => res.once('drain', () => {
          console.log("DRAINED MEMORY");
          delete content;
          ok = true
          resolve;
        }));
      }

    }
  });

  res.on('close', () => {
    console.log("CONNECTION HAS BEEN CLOSED, WAS IT EXPECTED?");
  });

  py.on('exit', async () => {
    console.log("DONE");
    while (!objQueue.isEmpty) {
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    res.end();
  });

  py.on('error', () => {
    console.log("VOCA Failed");
    res.send({ message: "VOCA Failed" });
  })

});
