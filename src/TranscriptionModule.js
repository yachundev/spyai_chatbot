import StateMachineService from "./StateMachineService.js";
import { isMobileView } from "./UserAgentModule.js";
import EventBus from "./EventBus.js";
import EventModule from "./EventModule.js";

const config = {
  appServerUrl: process.env.APP_SERVER_URL,
  apiServerUrl: process.env.API_SERVER_URL,
};

export function uploadAudio(audioBlob) {
  // Create a FormData object
  var formData = new FormData();
  var audioFilename = "audio.webm";
  if (audioBlob.type === "audio/mp4") {
    audioFilename = "audio.mp4";
  }
  // Add the audio blob to the FormData object
  formData.append("audio", audioBlob, audioFilename);
  // Get the user's preferred language
  var language = navigator.language;
  // Post the audio to the server for transcription
  fetch(config.apiServerUrl + "/transcribe?language=" + language, {
    method: "POST",
    body: formData,
  })
    .then(function (response) {
      if (!response.ok) {
        throw Error(response.statusText);
      }
      return response.json();
    })
    .then(function (responseJson) {
      if (responseJson.text.length === 0) {
        StateMachineService.actor.send("saypi:transcribedEmpty");
      } else {
        StateMachineService.actor.send("saypi:transcribed", {
          text: responseJson.text,
        });
      }
    })
    .catch(function (error) {
      console.error("Looks like there was a problem: ", error);
      StateMachineService.actor.send("saypi:transcribeFailed");
    });
}

export function handleTranscriptionResponse(transcript) {
  console.log("Transcript: " + transcript);
  const textarea = document.getElementById("saypi-prompt");
  if (isMobileView()) {
    // if transcript is > 1000 characters, truncate it to 999 characters plus an ellipsis
    if (transcript.length > 1000) {
      transcript = transcript.substring(0, 999) + "…";
      console.warn(
        "Transcript was too long for Pi. Truncated to 999 characters, losing the following text: ... " +
          transcript.substring(999)
      );
    }
    EventModule.setNativeValue(textarea, transcript);
    EventBus.emit("saypi:autoSubmit");
  } else {
    EventModule.simulateTyping(textarea, transcript + " ");
  }
}