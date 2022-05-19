# VOCA Express Backend

## Routes
### **/api**
**Type:** GET \
This route is used to verify that you are recieving responses from the Express server.

**How it Works:**\
The route returns a JSON object with the field 'message' whose value is "Hello from server!".

### **/uploadFile**
**Type:** POST \
This route is used to upload an audio file to the backend.

**How it Works:**\
The file is recieved via the request object (req). The file contents is then saved to the 'audio' directory in VOCA as 'userAudio.wav'. The route returns a JSON object with the field 'message' which stores a message reporting the success of the file save.

### **/uploadText**
**Type:** POST \
This route is used to upload user provided text to the backend to be used as the input for VOCA.

**How it Works:**\
The text is recieved via the request object (req). Google text-to-speech is then used to create an mp3 audio file from the text. This mp3 file is saved to the 'audio' directory in VOCA as 'userAudio.wav' and is later translated to a .wav format once the VOCA process is started. The generated audio file is then returned as the response to the frontend so that it can be stored an played for the final output. 

### **/getFiles**
**Type:** GET \
This route is used to request the start of the VOCA process and to initiate the streaming of the generated obj files to the frontend. 

**How it Works:**\
The first thing that happens is a python process is spawned which launches the VOCA program with specified options. After this process is launched there is a funciton that waits to recieve output messages from the process and performs operations on each of the recieved strings. The strings sent by the VOCA process should be individual obj file names, but occassionally there is a delay which causes multiple names to be sent. This is why each recieved string is handled in a loop. The first thing that happens when a string is recieved is it is added to a queue so that sll files are processed in order. From there, we wait for 'ok' to be true. When this variable is false, it means that another file is already being streamed and we want to wait for that send to finish to avoid creating issues with backpressure. When the 'ok' is finally given, the string is split up into individual file names and placed into an array. If there is only one file name in the string, then the array is created with only one element. We then enter a loop that executes for each of the file names in this array. Within this loop we start by reading the data of the specified file name and start streaming it to the frontend followed by a delimeter. The '$' character is used as the delimeter because it is not found in the contents of obj files. The function used to begin stream the data is 'res.write()'. This function returns true if the entire data was flushed successfully to the kernel buffer and returns false if all or part of the data was queued in user memory. To prevent backpressure issues, if any of the data was queued in user memory, we will want to wait for all of that data to be sent before attempting to stream another file. For this reason, we will hold the 'ok' lock and wait for the 'drain' event to be emitted before continuing on to stream the next file in the queue. The 'drain' event will be emitted when the buffer is free again. Once the user memory is empty again we continue to process/stream the next file in the queue. More information about how this request terminates can be found in the 'Event Listeners' section of this documentation.

## Event Listeners
When the VOCA python process is spawned, a few event listeners are used to monitor its state and the state of the response object. A description of each listener can be found below.

### **close:**
When the close event is detected, it means that the connection to the frontend ahs been closed (stream has stopped). This will print a message to the backend console to inform the administrator.

### **error:**
When the error event is detected, it means that the python process has encountered an error. In this case, a message will be printed to the backend console and a JSON object with the field 'message' will be sent to the frontend inforing it of the failure.

### **exit:**
When the exit event is detected, it means that the python process has terminated. A message is printed to the backend console, and the connection is closed once the queue of files has been emptie

## Queue Implementation
To store/process the file names in the order that they are recieved from the VOCA process, a queue is used. The queue implementation has the following functions/attributes:

### **enqueue():**
Adds an item to the back of the queue.

### **dequeue():**
Removes and returns the item from the top of the queue.

### **peek():**
Returns the item at the top of the queue without removing it.

### **length:**
Attribute that is the number of items in the queue.

### **isEmpty:**
Attribute that is true if the queue is empty and false otherwise.