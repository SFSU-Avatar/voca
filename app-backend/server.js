
const path = require("path");
const express = require('express');
const app = express();
const port = process.env.PORT || 5000;

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
  res.json({ message: "Hello from server!" });
});
