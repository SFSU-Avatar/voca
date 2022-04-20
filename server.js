
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
  console.log("VOCA TEXT", vocaText);

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
    console.log("VOCA TEXT", vocaText);

    res.sendFile(`${__dirname}/audio/userAudio.wav`);

  });

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
  /////////////////////////////////////////////////////////////////////////////


  //*************************RETURN FILES INSTANTLY ******************************/
  // let msg = "process audio: subj - seq\n00000.obj,00001.obj,00002.obj,00003.obj,00004.obj,00005.obj,00006.obj,00007.obj,00008.obj,00009.obj,00010.obj,00011.obj,00012.obj,00013.obj,00014.obj,00015.obj,00016.obj,00017.obj,00018.obj,00019.obj,00020.obj,00021.obj,00022.obj,00023.obj,00024.obj,00025.obj,00026.obj,00027.obj,00028.obj,00029.obj,00030.obj,00031.obj,00032.obj,00033.obj,00034.obj,00035.obj,00036.obj,00037.obj,00038.obj,00039.obj,00040.obj,00041.obj,00042.obj,00043.obj,00044.obj,00045.obj,00046.obj,00047.obj,00048.obj,00049.obj,00050.obj,00051.obj,00052.obj,00053.obj,00054.obj,00055.obj,00056.obj,00057.obj,00058.obj,00059.obj,00060.obj,00061.obj,00062.obj,00063.obj,00064.obj,00065.obj,00066.obj,00067.obj,00068.obj,00069.obj,00070.obj,00071.obj,00072.obj,00073.obj,00074.obj,00075.obj,00076.obj,00077.obj,00078.obj,00079.obj,00080.obj,00081.obj,00082.obj,00083.obj,00084.obj,00085.obj,00086.obj,00087.obj,00088.obj,00089.obj,00090.obj,00091.obj,00092.obj,00093.obj,00094.obj,00095.obj,00096.obj,00097.obj,00098.obj,00099.obj,00100.obj,00101.obj,00102.obj,00103.obj,00104.obj,00105.obj,00106.obj,00107.obj,00108.obj,00109.obj,00110.obj,00111.obj,00112.obj,00113.obj,00114.obj,00115.obj,00116.obj,00117.obj,00118.obj,00119.obj,00120.obj,00121.obj,00122.obj,00123.obj,00124.obj,00125.obj,00126.obj,00127.obj,00128.obj,00129.obj,00130.obj,00131.obj,00132.obj,00133.obj,00134.obj,00135.obj,00136.obj,00137.obj,00138.obj,00139.obj,00140.obj,00141.obj,00142.obj,00143.obj,00144.obj,00145.obj,00146.obj,00147.obj,00148.obj,00149.obj,00150.obj,00151.obj,00152.obj,00153.obj,00154.obj,00155.obj,00156.obj,00157.obj,00158.obj,00159.obj,00160.obj,00161.obj,00162.obj,00163.obj,00164.obj,00165.obj,00166.obj,00167.obj,00168.obj,00169.obj,00170.obj,00171.obj,00172.obj,00173.obj,00174.obj,00175.obj,00176.obj,00177.obj,00178.obj,00179.obj,00180.obj,00181.obj,00182.obj,00183.obj,00184.obj,00185.obj,00186.obj,00187.obj,00188.obj,00189.obj,00190.obj,00191.obj,00192.obj,00193.obj,00194.obj,00195.obj,00196.obj,00197.obj,00198.obj,00199.obj,00200.obj,00201.obj,00202.obj,00203.obj,00204.obj,00205.obj,00206.obj,00207.obj,00208.obj,00209.obj,00210.obj,00211.obj,00212.obj,00213.obj,00214.obj,00215.obj,00216.obj,00217.obj,";

  // res.writeHeader(200, {
  //   'Content-Type': 'model/obj'
  // });

  // var objNames = String(msg).slice(0, -1).replaceAll(" ", "").split("\n")[1].split(",");
  // objNames.forEach((objName) => {
  //   console.log(objName + "\n");
  //   //Store the file data of the first file into an object
  //   let objFile1 = fs.readFileSync(`./animation_output_textured/meshes/${objName}`, 'utf8', (err) => {
  //     if (err) {
  //       console.log("ERROR: " + err);
  //     }
  //   })

  //   res.write(JSON.stringify({ arrayBuffer: objFile1, name: objName, type: "model/obj" }));
  //   res.write("$");
  // });

  // res.end();


  // //Call VOCA
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

  //When OBJ files are ready
  py.stdout.on("data", (msg) => {
    console.log("STARTING", String(msg));
    msg = String(msg).replaceAll(" ", "").split("\n")[1].slice(0, -1);
    console.log(`${msg}`);

    res.writeHeader(200, {
      'Content-Type': 'model/obj'
    });

    var objNames = msg.split(",");
    objNames.forEach((objName) => {

      //Store the file data of the first file into an object
      let objFile1 = fs.readFileSync(`./animation_output_textured/meshes/${objName}`, 'utf8', (err) => {
        if (err) {
          console.log("ERROR: " + err);
        }
      });

      res.write(JSON.stringify({ arrayBuffer: objFile1, name: objName, type: "model/obj" }));
      res.write("$");
    });

    res.end();
  })


});
