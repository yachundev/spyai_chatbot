import { buttonModule } from "../ButtonModule";
import { createMachine, Typestate, assign } from "xstate";
import AnimationModule from "../AnimationModule";
import { isMobileView } from "../UserAgentModule";
import {
  uploadAudioWithRetry,
  setPromptText,
  isTranscriptionPending,
  clearPendingTranscriptions,
} from "../TranscriptionModule";
import EventBus from "../EventBus";

type SayPiEvent =
  | { type: "saypi:userSpeaking" }
  | { type: "saypi:userStoppedSpeaking"; duration: number; blob?: Blob }
  | { type: "saypi:userFinishedSpeaking" }
  | { type: "saypi:transcribed"; text: string; pFinishedSpeaking?: number }
  | { type: "saypi:transcribeFailed" }
  | { type: "saypi:transcribedEmpty" }
  | { type: "saypi:piSpeaking" }
  | { type: "saypi:piStoppedSpeaking" }
  | { type: "saypi:piFinishedSpeaking" }
  | { type: "saypi:submit" }
  | { type: "saypi:call" }
  | { type: "saypi:hangup" };

interface SayPiContext {
  transcriptions: Record<number, string>;
  lastState: "inactive" | "listening";
  timeUserStoppedSpeaking: number;
}

// Define the state schema
type SayPiStateSchema = {
  states: {
    inactive: {};
    errors: {
      states: {
        transcribeFailed: {};
        micError: {};
      };
    };
    listening: {
      states: {
        recording: {
          states: {
            userSpeaking: {};
            notSpeaking: {};
          };
        };
        converting: {
          states: {
            transcribing: {};
            accumulating: {};
            submitting: {};
          };
        };
      };
    };
    responding: {
      states: {
        piSpeaking: {};
      };
    };
  };
};

interface SayPiTypestate extends Typestate<SayPiContext> {
  value: "listening" | "inactive" | "errors" | "responding";
  context: SayPiContext;
}

/* external actions */
const clearTranscripts = assign({
  transcriptions: () => ({}),
});

export const machine = createMachine<SayPiContext, SayPiEvent, SayPiTypestate>(
  {
    context: {
      transcriptions: {},
      lastState: "inactive",
      timeUserStoppedSpeaking: 0,
    },
    id: "sayPi",
    initial: "inactive",
    states: {
      inactive: {
        description: "Idle state, not listening or speaking. Privacy mode.",
        exit: assign({ lastState: "inactive" }),
        on: {
          "saypi:call": {
            target: "#sayPi.listening.recording",
            actions: [
              {
                type: "callStarted",
              },
              {
                type: "startRecording",
              },
            ],
            description:
              'Enable the VAD microphone.\nAka "call" Pi.\nStarts active listening.',
          },
          "saypi:piSpeaking": {
            target: "#sayPi.responding.piSpeaking",
          },
        },
      },
      errors: {
        description: "Error parent state.",
        after: {
          "10000": [
            {
              target: "#sayPi.listening",
              actions: [],
              description: "Reset to the idle state and clear errors.",
            },
            {
              internal: false,
            },
          ],
        },
        initial: "transcribeFailed",
        states: {
          transcribeFailed: {
            description: "The /transcribe API responded with an error.",
            entry: {
              type: "startAnimation",
              params: {
                animation: "error",
              },
            },
            exit: {
              type: "stopAnimation",
              params: {
                animation: "error",
              },
            },
            type: "final",
          },
          micError: {
            description: "No audio input detected",
            entry: {
              type: "showNotification",
              params: {
                icon: "muted-microphone",
              },
            },
            exit: {
              type: "dismissNotification",
            },
            type: "final",
          },
        },
      },
      listening: {
        description:
          "Actively listening for user input. Simultaneously recording and transcribing user speech. Gentle pulsing animation.",
        entry: [
          {
            type: "stopAllAnimations",
          },
          {
            type: "acquireMicrophone",
          },
        ],
        exit: assign({ lastState: "listening" }),
        states: {
          recording: {
            description:
              "Microphone is on and VAD is actively listening for user speech.",
            initial: "notSpeaking",
            states: {
              notSpeaking: {
                description:
                  "Microphone is recording but no speech is detected.",
                on: {
                  "saypi:userFinishedSpeaking": {
                    target: "#sayPi.inactive",
                  },
                  "saypi:userSpeaking": {
                    target: "userSpeaking",
                  },
                },
              },
              userSpeaking: {
                description:
                  "User is speaking and being recorded by the microphone.\nWaveform animation.",
                entry: {
                  type: "startAnimation",
                  params: {
                    animation: "userSpeaking",
                  },
                },
                exit: {
                  type: "stopAnimation",
                  params: {
                    animation: "userSpeaking",
                  },
                },
                on: {
                  "saypi:userStoppedSpeaking": [
                    {
                      target: [
                        "notSpeaking",
                        "#sayPi.listening.converting.transcribing",
                      ],
                      cond: "hasAudio",
                      actions: assign({
                        timeUserStoppedSpeaking: () => new Date().getTime(),
                      }),
                    },
                    {
                      target: "notSpeaking",
                      cond: "hasNoAudio",
                    },
                  ],
                },
              },
            },
            on: {
              "saypi:hangup": {
                target: "#sayPi.inactive",
                actions: [
                  {
                    type: "stopRecording",
                  },
                  {
                    type: "releaseMicrophone",
                  },
                  {
                    type: "callEnded",
                  },
                ],
                description:
                  'Disable the VAD microphone.\n    Aka "call" Pi.\n    Stops active listening.',
              },
            },
          },
          converting: {
            initial: "accumulating",
            states: {
              accumulating: {
                description:
                  "Accumulating and assembling audio transcriptions into a cohesive prompt.\nSubmits a prompt when a threshold is reached.",
                entry: {
                  type: "mergeTranscripts",
                },
                after: {
                  submissionDelay: {
                    target: "submitting",
                    cond: "submissionConditionsMet",
                    description: "Submit combined transcript to Pi.",
                  },
                },
              },
              submitting: {
                description: "Submitting prompt to Pi.",
                entry: {
                  type: "setTranscriptAsPrompt",
                },
                exit: [clearTranscripts, clearPendingTranscriptions],
                always: {
                  target: "accumulating",
                },
              },
              transcribing: {
                description:
                  "Transcribing audio to text.\nCard flip animation.",
                entry: [
                  {
                    type: "startAnimation",
                    params: {
                      animation: "transcribing",
                    },
                  },
                  {
                    type: "transcribeAudio",
                  },
                ],
                exit: {
                  type: "stopAnimation",
                  params: {
                    animation: "transcribing",
                  },
                },
                on: {
                  "saypi:transcribed": {
                    target: "accumulating",
                    actions: {
                      type: "handleTranscriptionResponse",
                    },
                    description: "Successfully transcribed user audio to text.",
                  },
                  "saypi:transcribeFailed": {
                    target: "#sayPi.errors.transcribeFailed",
                    description:
                      "Received an error response from the /transcribe API",
                  },
                  "saypi:transcribedEmpty": {
                    target: "#sayPi.errors.micError",
                    description:
                      "Received an empty response from the /transcribe API (no speech detected)",
                  },
                },
              },
            },
          },
        },
        on: {
          "saypi:piSpeaking": {
            target: "#sayPi.responding.piSpeaking",
          },
        },
        type: "parallel",
      },
      responding: {
        description:
          "Pi is responding. Synthesised speech is playing or waiting to play.",
        entry: {
          type: "disableCallButton",
        },
        exit: {
          type: "enableCallButton",
        },
        initial: "piSpeaking",
        states: {
          piSpeaking: {
            description:
              "Pi's synthesised speech audio is playing.\nPlayful animation.",
            entry: {
              type: "startAnimation",
              params: {
                animation: "piSpeaking",
              },
            },
            exit: {
              type: "stopAnimation",
              params: {
                animation: "piSpeaking",
              },
            },
            on: {
              "saypi:piStoppedSpeaking": [
                {
                  target: "#sayPi.listening",
                  cond: "wasListening",
                },
                {
                  target: "#sayPi.inactive",
                  cond: "wasInactive",
                },
              ],
              "saypi:userSpeaking": {
                target: "#sayPi.listening.recording.userSpeaking",
              },
              "saypi:piFinishedSpeaking": {
                target: "#sayPi.listening",
              },
            },
          },
        },
      },
    },
    predictableActionArguments: true,
    preserveActionOrder: true,
  },
  {
    actions: {
      stopAllAnimations: (context, event) => {
        AnimationModule.stopAllAnimations();
      },

      startAnimation: (context, event, { action }) => {
        AnimationModule.startAnimation(action.params.animation);
      },

      stopAnimation: (context, event, { action }) => {
        AnimationModule.stopAnimation(action.params.animation);
      },

      transcribeAudio: (
        context,
        event: {
          type: "saypi:userStoppedSpeaking";
          duration: number;
          blob: Blob;
        }
      ) => {
        const audioBlob = event.blob;
        uploadAudioWithRetry(audioBlob, event.duration);
      },

      handleTranscriptionResponse: (
        SayPiContext,
        event: {
          type: "saypi:transcribed";
          text: string;
          sequenceNumber: number;
          pFinishedSpeaking?: number;
        }
      ) => {
        console.log("handleTranscriptionResponse", event);
        const transcription = event.text;
        const sequenceNumber = event.sequenceNumber;
        SayPiContext.transcriptions[sequenceNumber] = transcription;
      },

      acquireMicrophone: (context, event) => {
        // warmup the microphone on idle in mobile view,
        // since there's no mouseover event to trigger it
        if (isMobileView()) {
          EventBus.emit("audio:setupRecording");
        }
      },

      startRecording: (context, event) => {
        EventBus.emit("audio:startRecording");
      },

      stopRecording: (context, event) => {
        EventBus.emit("audio:stopRecording");
      },

      showNotification: (context, event, { action }) => {
        const icon = action.params.icon;
        const message = action.params.message;
        buttonModule.showNotification({ icon, message });
      },

      dismissNotification: () => {
        buttonModule.dismissNotification();
      },

      mergeTranscripts: assign((context) => {
        const sortedKeys = Object.keys(context.transcriptions)
          .map(Number)
          .sort((a, b) => a - b);

        let currentSeq = -1;
        let currentTranscript = "";
        const mergedTranscripts: string[] = [];

        for (const key of sortedKeys) {
          if (currentSeq === -1 || key === currentSeq + 1) {
            // Contiguous sequence
            currentTranscript += " " + context.transcriptions[key];
          } else {
            // Gap in sequence
            mergedTranscripts.push(currentTranscript.trim());
            currentTranscript = context.transcriptions[key];
          }
          currentSeq = key;
        }

        if (currentTranscript) {
          mergedTranscripts.push(currentTranscript.trim());
        }

        if (mergedTranscripts.length > 0) {
          return {
            transcriptions: mergedTranscripts,
          };
        }
        return {};
      }),

      setTranscriptAsPrompt: (SayPiContext) => {
        const keys = Object.keys(SayPiContext.transcriptions);
        if (keys.length === 1) {
          const key = parseInt(keys[0]);
          const prompt = SayPiContext.transcriptions[key];
          setPromptText(prompt);
        } else {
          console.error(
            "Not all transcripts have been merged. Not setting prompt."
          );
        }
      },

      callStarted: () => {
        buttonModule.callActive();
      },
      callEnded: () => {
        buttonModule.callInactive();
      },
      disableCallButton: () => {
        buttonModule.disableCallButton();
      },
      enableCallButton: () => {
        buttonModule.enableCallButton();
      },
    },
    services: {},
    guards: {
      hasAudio: (context: SayPiContext, event: SayPiEvent) => {
        if (event.type === "saypi:userStoppedSpeaking") {
          return event.blob !== undefined && event.duration > 0;
        }
        return false;
      },
      hasNoAudio: (context: SayPiContext, event: SayPiEvent) => {
        if (event.type === "saypi:userStoppedSpeaking") {
          return (
            event.blob === undefined ||
            event.blob.size === 0 ||
            event.duration === 0
          );
        }
        return false;
      },
      submissionConditionsMet: (SayPiContext, event, meta) => {
        const { state } = meta;
        const allowedState = !(
          state.matches("listening.recording.userSpeaking") ||
          state.matches("listening.converting.transcribing")
        );
        const transcriptsMerged =
          Object.keys(SayPiContext.transcriptions).length == 1;
        const pending = isTranscriptionPending();
        console.log("Allowed state:", allowedState);
        console.log("Transcripts merged:", transcriptsMerged);
        console.log("Transcription pending:", pending);
        console.log("Ready for submission:", allowedState && transcriptsMerged);
        return allowedState && transcriptsMerged && !pending;
      },
      wasListening: (SayPiContext) => {
        return SayPiContext.lastState === "listening";
      },
      wasInactive: (SayPiContext) => {
        return SayPiContext.lastState === "inactive";
      },
    },
    delays: {
      submissionDelay: (context: SayPiContext, event: SayPiEvent) => {
        if (event.type !== "saypi:transcribed") {
          return 0;
        }

        const maxDelay = 10000; // 10 seconds in milliseconds

        // Get the current time (in milliseconds)
        const currentTime = new Date().getTime();

        // Calculate the time elapsed since the user stopped speaking (in milliseconds)
        const timeElapsed = currentTime - context.timeUserStoppedSpeaking;

        // Calculate the initial delay based on pFinishedSpeaking
        let probability = 1;
        if (event.pFinishedSpeaking !== undefined) {
          probability = event.pFinishedSpeaking;
        }
        const initialDelay = (1 - probability) * maxDelay;

        // Calculate the final delay after accounting for the time already elapsed
        const finalDelay = Math.max(initialDelay - timeElapsed, 0);

        console.log(
          "Waiting for",
          finalDelay / 1000,
          "seconds before submitting"
        );

        return finalDelay;
      },
    },
  }
);
