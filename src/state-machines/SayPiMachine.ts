import { buttonModule } from "../ButtonModule.js";
import { createMachine, Typestate, assign, log, DoneInvokeEvent, State } from "xstate";
import AnimationModule from "../AnimationModule.js";
import { AudibleNotificationsModule, VisualNotificationsModule } from "../NotificationsModule";
import { isMobileView } from "../UserAgentModule.js";
import {
  uploadAudioWithRetry,
  setDraftPrompt,
  setFinalPrompt,
  isTranscriptionPending,
  clearPendingTranscriptions,
} from "../TranscriptionModule";
import { TranscriptMergeService } from "../TranscriptMergeService";
import { config } from "../ConfigModule";
import EventBus from "../EventBus";
import { calculateDelay } from "../TimerModule";
import AudioControlsModule from "../AudioControlsModule";
import { requestWakeLock, releaseWakeLock } from "../WakeLockModule";

type SayPiTranscribedEvent = {
  type: "saypi:transcribed";
  text: string;
  sequenceNumber: number;
  pFinishedSpeaking?: number;
  tempo?: number;
  merged?: number[];
};

type SayPiSpeechStoppedEvent = {
  type: "saypi:userStoppedSpeaking";
  duration: number;
  blob?: Blob;
};

type SayPiEvent =
  | { type: "saypi:userSpeaking" }
  | SayPiSpeechStoppedEvent
  | { type: "saypi:userFinishedSpeaking" }
  | SayPiTranscribedEvent
  | { type: "saypi:transcribeFailed" }
  | { type: "saypi:transcribedEmpty" }
  | { type: "saypi:piThinking" }
  | { type: "saypi:piSpeaking" }
  | { type: "saypi:piStoppedSpeaking" }
  | { type: "saypi:piFinishedSpeaking" }
  | { type: "saypi:submit" }
  | { type: "saypi:call" }
  | { type: "saypi:callReady" }
  | { type: "saypi:callFailed" }
  | { type: "saypi:hangup" }
  | { type: "saypi:visible" };

interface SayPiContext {
  transcriptions: Record<number, string>;
  isTranscribing: boolean; // duplicate of state.matches("listening.converting.transcribing")
  lastState: "inactive" | "listening";
  userIsSpeaking: boolean; // duplicate of state.matches("listening.recording.userSpeaking")
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
    callStarting: {};
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
        piThinking: {};
        piSpeaking: {};
      };
    };
  };
};

interface SayPiTypestate extends Typestate<SayPiContext> {
  value: "listening" | "inactive" | "callStarting" | "errors" | "responding";
  context: SayPiContext;
}

function getHighestKey(transcriptions: Record<number, string>): number {
  // Find the highest existing key in the transcriptions
  const highestKey = Object.keys(transcriptions).reduce(
    (max, key) => Math.max(max, parseInt(key, 10)),
    -1
  );
  return highestKey;
}
// time at which the user's prompt is scheduled to be submitted
// used to judge whether there's time for another remote operation (i.e. merge request)
var nextSubmissionTime = Date.now();

const apiServerUrl = config.apiServerUrl;
if (apiServerUrl === undefined) {
  throw new Error(
    "Configuration error: apiServerUrl is not defined. Please check your environment variables."
  );
}
const mergeService = new TranscriptMergeService(
  apiServerUrl,
  navigator.language
);

/* external actions */
const clearTranscripts = assign({
  transcriptions: () => ({}),
});

const audibleNotifications = new AudibleNotificationsModule();
const visualNotifications = new VisualNotificationsModule();
const audioControls = new AudioControlsModule();

export const machine = createMachine<SayPiContext, SayPiEvent, SayPiTypestate>(
  {
    /** @xstate-layout N4IgpgJg5mDOIC5SwIYE8AKBLAdFgdigMYAuWAbmAMSpoAOWCRKANiwNoAMAuoqHQHtYWMgPx8QAD0QBWAEwAaEGkRyA7HIBsOAMyc1AFjkAODcf3GdAXytLa2PIVIVqtBggYBlOmBQBrAiguXiQQQWFRcVDpBHklFQQ5OQMARl19GWMUnRkU7M0bO3QHZjZPEhQAJzJ8KBp0d1KWACVfCDRgiXCRLDEJGINMgE4cIc4ZIeM5TgNjIZ0U+MQUmU4cGc0huR1NFK0Da1sQe1wm8qqaurdGJoAxFCwWSE7Q7sj+xE1FZVUvgxxzIYcilAalCsdirgWFhYCQwPhAvV6IwGAAVAAWBACtRe-CEPT60U+3wS00MOE0Mx0ak2Ml2nAKRxOOGhsPhiOuHiw3l82KCPC6+PeRNiJMQWRwq040pWQwm8jBTMhLJhcIRtRwlTARAElQgHIajHRKFqAFc6LiwkLelFQAMJiMxhMpjM5gslggVpptFpLGo1CsDJoDODmay1YFNdrdfqNfgBCQef4DciEKbYGBKrcCDD0ZAk3zLW8bR8EIMho7xpNprN5osfp6aWoKepNnoZGpqTNQ8rw+yNVqdXrI-HEz5k7Uke505mC4Ei9bCXbVHIKzgDBXLENZsGUkM1B7ZSM9+ZgwYGf7DkVMFDVf2oFGh7GHzPKnPJ5zX+UBHQfBB3-yIR4hEJYitM5gAnsBizLWQaaDIh5qNKOB7moQxfJw4H6Iy14OH26oPoOMaRl+458lOjBfiQP5-gB7ApEBVogUuUiqJwEFZMkMFzHBCENikwYjJsWTsXueyYSGSo3iqbIETgOr4JQ1SRsQRCmgAtqaLAoJcVAQGIYCOOQAh+IZ6mZjAADydBkOpqpYEQC7MbarGJNSaRyB23pIdsDKWB6co6OuDI7Do1LQYMxg9tJ+GRgpSmXDgqkaVpOmIpmlS6jgdDaSQABmurqTg5mVFZNlYHZsIOU5BIuTE2wBqMnnBgsXyaNSB4NsYEyjDIOieZM4VNtFeF3nJ8WZolyWablKbuCQlQmrARCVFgABGzwCq8i51Su3WjJu7Vhf1QYegGciStK7HUqYJ04RCMVjXFYgJSpRBqTNaUfoaCALUtK3rWA9yPJtjHFixMRhUYl1AnS+4pAYnUJCkMz-PIlJqOYyQgmhI23rJz2KZNb0falumcn9+DLatG0QAAoupNkdFtwG1aWUMXassObAGiMBQc6xaCjUxyOJ1J4zJEYahNykatNZOIpIsI6YZKB5XClQABSwKaa2VcIYgACJgNpaAAJRIqNBPSy9xNy+9KWzTiLNMWzYGdv8FaTBu54LJjh4pJjKGcNudKeQcMiIxLsU20TssPjresiLpNXCsuCB6HuMN9ZomO7P6Ad6BSIdBjoky8ys0dPbHr0apT1PrXNjD1wDtOp6B6d7pwaScAsqE6IMIcCYeGw4AGGHobndIpFX1sPjLiUtzTTe-YtVOt0DDxPBA7cQ4gHMwxHPMI0jsg0usV3o4HGNRVJVtS-PtvxzgS+N99qav7TDNM7vu0ZwPnN9BH3hnzfiJ1Ba7HpDkHIQZZ4PxwBlXU5wSDpgQZUTKlRYBUCVhUOESV1aZk1lKTgFswzVwfIgt8uDUGUNgL-UsqQ1yY1MIjYw8FnRnVyMHLYAYB4rGGnffG8DKHIJoeg3UWCcEq3wRrIhV1SG9nIWgjBojYDKIkfRMGO0GEgiCrkIYAlpgh3YmKT0exjDcMRmoOkUNb64VwFqWAgh8DPgommDMb4yLzhduDP+eRkg4E8pjIwGN5B0g9IjGQY8pSR3mFsbqbCJaOOcc+bKWAMRYhXl4LxzstHOQYbndcWxwKWBlJsD0MgepXSrPMaYBi1BJLgCkyM2TeRZO5NRX8+YcmAUFPkkU-j-hBOMCEjIzVDybH+P6XY55jCWAmDsRpTixCpNaROK4P0vCdNoj0zRfS3adxRkMjsIytBjPCfxQKAJI45FWO1OYldBFRmWS4lp3IeluIYNmBEsA8z-l2T47RAy8jHOCWc6x4z+KGCia2EEcEsb9RsEceMEA4ASBOPstOrkDAegALT3WZAQYgZBKCYo7tiyYawxiUgEqYdiUxEJl3WP6JCYwDHqEWU8s4FR45kr3mWAW1SB5TD3LkD0Zye4djLtkQehhJL2MlvePlfirGQU8nkQOKxI6mI5cXMYWhRadkwskOB95HzEVqMq0sKwchqtyHkAMlSjCHnPBdWF5YdgjIaU8mOhFozDjjAmACVqwKrCiQ68Y0FvQmARhMou0FzAD0xoHXmpq5JEQDS+Dxwbtr9M7pkIKnF7WaqdaY2UQyaQI3mGGvIabCa1ygCG-Nnk7Uasddqj0XwolXQdYCMYgc601ztg+eWTtG25oOa5JI6gDoVnEt1LQmgR5cO6tub0BiEaPIVb6+ST9EqJzsiQS4TbXJ9zRvMSKSFdiWBxfxFGaxWwhwWEkWkdiHr3zNQvSMn9AgnpiPwwtexi3tudfxaUzZNgmD9nSDYM8fVKJEdQ+AE6sWQyNYfJC+iQ6dgqXkbhIc2EJtFqYQdFDxFUJ0qg+MlR1KsD-fvf0FiuaI3GF3fcOhDw6BGXq8K3UFgbgJYoue6iKMoLUbQ+jGc0JROY5htjOGGwtW4aLBGBwUbwVIyJ1RIm1Gf03iDCAkmuMC1k6xtlCmEj+nDU+5I2NpUyE04hyj4nyNqLskQOm5GjMjL0UAuT5mOMNm3GsSkwXjHbGEks5plqUPkpiJHcVmRonSjqfUlqgnpLJJWW8jJ+A+SSZRqYrmgSpSrgAWhQYUXssajWfl2L-LvT-BxqsbIpg5hLobCxkrKXNAjPagYxkNggA */
    context: {
      transcriptions: {},
      isTranscribing: false,
      lastState: "inactive",
      userIsSpeaking: false,
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
            target: "#sayPi.callStarting",
            description:
              'Place a "call" to Pi.\nAttempts to start the microphone and begin active listening.',
          },
          "saypi:piSpeaking": {
            target: "#sayPi.responding.piSpeaking",
          },
        },
      },

      callStarting: {
        description: "Call is starting. Waiting for microphone to be acquired.",
        entry: [
          {
            type: "callIsStarting",
          },
          {
            type: "setupRecording",
          }
        ],
        on: {
          "saypi:callReady": {
            target: "#sayPi.listening.recording",
            actions: [
              {
                type: "callHasStarted",
              },
              {
                type: "startRecording",
              },
              {
                type: "activateAudioOutput",
              },
              {
                type: "requestWakeLock",
              }
            ],
            description:
              'VAD microphone is ready.\nStart it recording.',
          },
          "saypi:callFailed": {
            target: "inactive",
            description:
              "VAD microphone failed to start.\nAudio device not available.",
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
            entry: [
              {
                type: "startAnimation",
                params: {
                  animation: "glow",
                },
              },
            ],
            exit: [
              {
                type: "stopAnimation",
                params: {
                  animation: "glow",
                },
              },
            ],
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
                entry: [{
                  type: "startAnimation",
                  params: {
                    animation: "userSpeaking",
                  },
                },
              assign({ userIsSpeaking: true }),
              {
                type: "cancelCountdownAnimation",
              }],
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
                      actions: [
                        assign({
                          userIsSpeaking: false,
                          timeUserStoppedSpeaking: () => new Date().getTime(),
                        }),
                        {
                          type: "transcribeAudio",
                        },
                      ],
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
                    type: "callHasEnded",
                  },
                  {
                    type: "releaseWakeLock",
                  }
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
                after: {
                  submissionDelay: {
                    target: "submitting",
                    cond: "submissionConditionsMet",
                    description: "Submit combined transcript to Pi.",
                  },
                },
                entry: {
                  type: "draftPrompt",
                },
                invoke: {
                  id: "mergeOptimistic",
                  src: (context: SayPiContext, event: SayPiEvent) => {
                    // Check if there are two or more transcripts to merge
                    if (Object.keys(context.transcriptions).length > 1) {
                      // This function should return a Promise that resolves with the merged transcript string
                      return mergeService.mergeTranscriptsRemote(
                        context.transcriptions,
                        nextSubmissionTime
                      );
                    } else {
                      // If there's one or no transcripts to merge, return a resolved Promise with the existing transcript string or an empty string
                      const existingTranscriptKeys = Object.keys(
                        context.transcriptions
                      );
                      if (existingTranscriptKeys.length === 1) {
                        const key = existingTranscriptKeys[0];
                        return Promise.resolve(
                          context.transcriptions[Number(key)]
                        );
                      } else {
                        return Promise.resolve(""); // No transcripts to merge
                      }
                    }
                  },

                  onDone: {
                    target: "accumulating",
                    internal: true,
                    actions: [
                      assign({
                        transcriptions: (
                          context: SayPiContext,
                          event: DoneInvokeEvent<string>
                        ) => {
                          // If the event.data is empty, just return the current context.transcriptions
                          if (!event.data) {
                            return context.transcriptions;
                          }

                          // Use the highest key for the merged transcript
                          const nextKey = getHighestKey(context.transcriptions);
                          const originalKeys = Object.keys(
                            context.transcriptions
                          );
                          if (originalKeys.length > 1) {
                            console.log(
                              `Merge accepted: ${originalKeys} into ${nextKey} - ${event.data}`
                            );
                          }
                          return { [nextKey]: event.data };
                        },
                      }),
                    ],
                  },

                  onError: {
                    actions: log(
                      "Merge request did not complete, and will be ignored"
                    ),
                  },
                },
                on: {
                  "saypi:transcribed": {
                    target: "accumulating",
                    actions: {
                      type: "handleTranscriptionResponse",
                    },
                    description:
                      "Transcribed speech to text (out of sequence response).",
                  },
                  "saypi:transcribeFailed": {
                    target: "#sayPi.listening.errorStatus.errors.transcribeFailed",
                    description:
                      "Out of sequence error response from the /transcribe API",
                  },
                  "saypi:transcribedEmpty": {
                    target: "#sayPi.listening.errorStatus.errors.micError",
                    description:
                      "Out of sequence empty response from the /transcribe API",
                  },
                },
              },
              submitting: {
                description: "Submitting prompt to Pi.",
                entry: {
                  type: "mergeAndSubmitTranscript",
                },
                exit: [clearTranscripts, clearPendingTranscriptions],
                always: {
                  target: "accumulating",
                },
              },
              transcribing: {
                description:
                  "Transcribing audio to text.\nCard flip animation.",
                entry: [{
                  type: "startAnimation",
                  params: {
                    animation: "transcribing",
                  },
                },
              assign({ isTranscribing: true })],
                exit: [{
                  type: "stopAnimation",
                  params: {
                    animation: "transcribing",
                  },
                },
                assign({ isTranscribing: false })],
                on: {
                  "saypi:transcribed": {
                    target: "accumulating",
                    actions: {
                      type: "handleTranscriptionResponse",
                    },
                    description: "Successfully transcribed user audio to text.",
                  },
                  "saypi:transcribeFailed": {
                    target: "#sayPi.listening.errorStatus.errors.transcribeFailed",
                    description:
                      "Received an error response from the /transcribe API",
                  },
                  "saypi:transcribedEmpty": {
                    target: "#sayPi.listening.errorStatus.errors.micError",
                    description:
                      "Received an empty response from the /transcribe API (no speech detected)",
                  },
                },
              },
            },
          },

          errorStatus: {
            description: `Handles non-fatal errors during recording and transcription.`,
            initial: "normal",
            states: {
              normal: {
                description: "The system is not exhibiting any errors.",
              },
              errors: {
                description: `Non-fatal transcription or recording errors.`,
                entry: {
                  type: "callHasErrors",
                },
                exit: {
                  type: "callHasNoErrors",
                },
                after: {
                  "5000": [
                    {
                      target: "#sayPi.listening.errorStatus.normal",
                      actions: [],
                      description: "Reset to the normal state and clear errors.",
                    },
                  ],
                },
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
                type: "parallel",
              },
            },
          }
        },
        on: {
          "saypi:piThinking": {
            target: "#sayPi.responding.piThinking",
            actions: [
              {
                type: "acknowledgeUserInput",
              },
            ],
          },
          "saypi:piSpeaking": {
            target: "#sayPi.responding.piSpeaking",
          },
          "saypi:visible": {
            actions: {
              type: "requestWakeLock",
            }
          }
        },
        type: "parallel",
      },

      responding: {
        description:
          "Pi is responding. Text is being generated or synthesised speech is playing or waiting to play.",
        entry: {
          type: "disableCallButton",
        },
        exit: {
          type: "enableCallButton",
        },
        initial: "piSpeaking",
        on: {
          "saypi:userSpeaking": {
            target: "#sayPi.listening.recording.userSpeaking",
          },
          "saypi:hangup": {
            target: "#sayPi.inactive",
            actions: [
              {
                type: "callHasEnded",
              },
            ],
            description:
              'End call while Pi is speaking.',
          },
        },
        states: {
          piThinking: {
            description: "Pi is contemplating its response.\nThinking animation.",
            entry: {
              type: "startAnimation",
              params: {
                animation: "piThinking",
              },
            },
            exit: {
              type: "stopAnimation",
              params: {
                animation: "piThinking",
              },
            },
            on: {
              "saypi:piSpeaking": {
                target: "#sayPi.responding.piSpeaking",
              },
            },
          },
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
              "saypi:piFinishedSpeaking": {
                target: "#sayPi.listening",
              },
            },
          },
        },
      }
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
        context: SayPiContext,
        event: SayPiSpeechStoppedEvent
      ) => {
        const audioBlob = event.blob;
        if (audioBlob) {
          uploadAudioWithRetry(
            audioBlob,
            event.duration,
            context.transcriptions
          );
        }
      },

      handleTranscriptionResponse: (
        SayPiContext,
        event: SayPiTranscribedEvent
      ) => {
        console.log("handleTranscriptionResponse", event);
        const transcription = event.text;
        const sequenceNumber = event.sequenceNumber;
        SayPiContext.transcriptions[sequenceNumber] = transcription;
        if (event.merged) {
          event.merged.forEach((mergedSequenceNumber) => {
            delete SayPiContext.transcriptions[mergedSequenceNumber];
          });
        }
      },

      acquireMicrophone: (context, event) => {
        // warmup the microphone on idle in mobile view,
        // since there's no mouseover event to trigger it
        if (isMobileView()) {
          EventBus.emit("audio:setupRecording");
        }
      },

      setupRecording: (context, event) => {
        // differs from acquireMicrophone in that it's user-initiated
        EventBus.emit("audio:setupRecording");
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

      acknowledgeUserInput: () => {
        visualNotifications.listeningStopped();
        audibleNotifications.listeningStopped();
      },

      draftPrompt: (context: SayPiContext) => {
        const prompt = mergeService
          .mergeTranscriptsLocal(context.transcriptions)
          .trim();
        if (prompt) setDraftPrompt(prompt);
      },

      mergeAndSubmitTranscript: (context: SayPiContext) => {
        const prompt = mergeService
          .mergeTranscriptsLocal(context.transcriptions)
          .trim();
        if (prompt) setFinalPrompt(prompt);
      },

      callIsStarting: () => {
        buttonModule.callStarting();
      },

      callHasStarted: () => {
        buttonModule.callActive();
        audibleNotifications.callStarted();
      },
      callHasEnded: () => {
        visualNotifications.listeningStopped();
        buttonModule.callInactive();
        audibleNotifications.callEnded();
      },
      callHasErrors: () => {
        buttonModule.callError();
      },
      callHasNoErrors: () => {
        buttonModule.callActive();
      },
      disableCallButton: () => {
        buttonModule.disableCallButton();
      },
      enableCallButton: () => {
        buttonModule.enableCallButton();
      },
      cancelCountdownAnimation: () => {
        visualNotifications.listeningStopped();
      },
      activateAudioOutput: () => {
        audioControls.activateAudioOutput(true);
      },
      requestWakeLock: () => {
        requestWakeLock();
      },
      releaseWakeLock: () => {
        releaseWakeLock();
      }
    },
    services: {},
    guards: {
      hasAudio: (context: SayPiContext, event: SayPiEvent) => {
        if (event.type === "saypi:userStoppedSpeaking") {
          event = event as SayPiSpeechStoppedEvent;
          return event.blob !== undefined && event.duration > 0;
        }
        return false;
      },
      hasNoAudio: (context: SayPiContext, event: SayPiEvent) => {
        if (event.type === "saypi:userStoppedSpeaking") {
          event = event as SayPiSpeechStoppedEvent;
          return (
            event.blob === undefined ||
            event.blob.size === 0 ||
            event.duration === 0
          );
        }
        return false;
      },
      submissionConditionsMet: (
        context: SayPiContext,
        event: SayPiEvent,
        meta
      ) => {
        const { state } = meta;
        return readyToSubmit(state, context);
      },
      wasListening: (context: SayPiContext) => {
        return context.lastState === "listening";
      },
      wasInactive: (context: SayPiContext) => {
        return context.lastState === "inactive";
      },
    },
    delays: {
      submissionDelay: (context: SayPiContext, event: SayPiEvent) => {
        // check if the event is a transcription event
        if (event.type !== "saypi:transcribed") {
          return 0;
        } else {
          event = event as SayPiTranscribedEvent;
        }

        const maxDelay = 10000; // 10 seconds in milliseconds

        // Calculate the initial delay based on pFinishedSpeaking
        let probabilityFinished = 1;
        if (event.pFinishedSpeaking !== undefined) {
          probabilityFinished = event.pFinishedSpeaking;
        }

        // Incorporate the tempo into the delay, defaulting to 0.5 (average tempo) if undefined
        let tempo = event.tempo !== undefined ? event.tempo : 0.5;

        const finalDelay = calculateDelay(
          context.timeUserStoppedSpeaking,
          probabilityFinished,
          tempo,
          maxDelay
        );

        console.log(
          "Waiting for",
          (finalDelay / 1000).toFixed(1),
          "seconds before submitting"
        );

        // ideally we would use the current state to determine if we're ready to submit,
        // but we don't have access to the state here, so we'll use the provisional readyToSubmit
        const ready = provisionallyReadyToSubmit(context);
        if (finalDelay > 0 && ready) {
          visualNotifications.listeningTimeRemaining(finalDelay / 1000);
        }

        // Get the current time (in milliseconds)
        const currentTime = new Date().getTime();
        nextSubmissionTime = currentTime + finalDelay;

        return finalDelay;
      },
    },
  }
);
function readyToSubmitOnAllowedState(allowedState: boolean, context: SayPiContext): boolean {
  const empty = Object.keys(context.transcriptions).length === 0;
  const pending = isTranscriptionPending();
  const ready = allowedState && !empty && !pending;
  return ready;
}
function provisionallyReadyToSubmit(context: SayPiContext): boolean {
  const allowedState = !(context.userIsSpeaking || context.isTranscribing); // we don't have access to the state, so we read from a copy in the context (!DRY)
  console.log("provisionallyReadyToSubmit", allowedState, context);
  return readyToSubmitOnAllowedState(allowedState, context);
}
function readyToSubmit(state: State<SayPiContext, SayPiEvent, any, any, any>, context: SayPiContext): boolean {
  const allowedState = !(
    state.matches("listening.recording.userSpeaking") ||
    state.matches("listening.converting.transcribing")
  );
  return readyToSubmitOnAllowedState(allowedState, context);
}

