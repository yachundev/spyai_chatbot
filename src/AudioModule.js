// import state machines for audio input and output
const { interpret } = require("xstate");
const { audioInputMachine } = require("./state-machines/AudioInputMachine");
const { audioOutputMachine } = require("./state-machines/AudioOutputMachine");

// depends on the injecting script (saypi.index.js) declaring the EventBus as a global variable
const EventBus = window.EventBus;

// audio output (Pi)
const audioElement = document.querySelector("audio");
if (!audioElement) {
  console.error("Audio element not found!");
} else {
  audioElement.preload = "auto"; // enable aggressive preloading of audio
}

const audioOutputActor = interpret(audioOutputMachine).start();

function registerAudioPlaybackEvents(audio, actor) {
  audio.addEventListener("loadstart", function () {
    actor.send("loadStart");
  });

  // Intercept Autoplay Events (can't autoplay full audio on Safari)
  audio.addEventListener("play", function () {
    actor.send("play");
  });

  // Event listeners for detecting when Pi is speaking
  audio.addEventListener("playing", () => {
    actor.send("play");
  });

  audio.addEventListener("pause", () => {
    actor.send("pause");
  });

  audio.addEventListener("ended", () => {
    actor.send("ended");
  });
}
registerAudioPlaybackEvents(audioElement, audioOutputActor);

// audio input (user)
const audioInputActor = interpret(audioInputMachine).start();

/* These events are used to control/pass requests to the audio module from other modules */
function registerAudioCommands() {
  // audio input (recording) commands
  EventBus.on("audio:setupRecording", function (e) {
    audioInputActor.send("acquire");
  });

  EventBus.on("audio:tearDownRecording", function (e) {
    audioInputActor.send("release");
  });

  EventBus.on("audio:startRecording", function (e) {
    // Check if Pi is currently speaking and stop her audio
    audioOutputActor.send("pause");

    // Check if the MediaRecorder is acquired before starting?
    audioInputActor.send("acquire");
    audioInputActor.send("start");
  });
  EventBus.on("audio:stopRecording", function (e) {
    audioInputActor.send("stopRequested");
    /* resume or cancel Pi's audio */
    /* TODO: reassess how to handle interruptions
    audioOutputActor.send("play"); // resume Pi's audio
    audioOutputActor.send("stop"); // cancel Pi's audio
    */
  });
  // audio input (recording) events (pass MediaRecorder events -> audio input machine actor)
  EventBus.on("audio:dataavailable", (detail) => {
    audioInputActor.send({ type: "dataAvailable", ...detail });
  });
  EventBus.on("audio:input:stop", function (e) {
    audioInputActor.send("stop");
  });

  // audio output (playback) commands
  EventBus.on("audio:reload", function (e) {
    audioOutputActor.send("reload");
  });
}
registerAudioCommands();
