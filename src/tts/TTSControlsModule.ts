import getMessage from "../i18n";
import {
  SpeechSynthesisModule,
  SpeechSynthesisUtteranceRemote,
  SpeechSynthesisVoiceRemote,
} from "./SpeechSynthesisModule";
import volumeIconSVG from "../icons/volume-mid.svg";
import { getResourceUrl } from "../ResourceModule";

export class TTSControlsModule {
  constructor(private speechSynthesis: SpeechSynthesisModule) {}

  createSpeechButton() {
    const button = document.createElement("button");
    button.type = "button";
    button.classList.add(
      "text-center",
      "hover:bg-neutral-300",
      "saypi-speak-button"
    );
    button.title = getMessage("readAloudButtonTitle");
    button.innerHTML = volumeIconSVG;
    return button;
  }

  addSpeechButton(
    utterance: SpeechSynthesisUtteranceRemote,
    container: HTMLElement
  ): void {
    const button = this.createSpeechButton();
    button.addEventListener("click", () => {
      this.speechSynthesis.speak(utterance);
    });
    container.appendChild(button);
  }

  /**
   * Add the cost of the TTS stream to the chat message
   * @param container The menu element to add the cost basis to
   * @param characterCount The number of characters in the message
   */
  addCostBasis(
    container: HTMLElement,
    characterCount: number,
    voice: SpeechSynthesisVoiceRemote
  ) {
    const pricePer1kCharacters = voice.price;
    const cost = (characterCount / 1000) * pricePer1kCharacters;
    const currency = getMessage("currencyUSDAbbreviation");
    const costElement = document.createElement("div");
    costElement.classList.add("text-sm", "text-neutral-500", "saypi-cost");
    costElement.title = getMessage("ttsCostExplanation", [
      cost.toFixed(2),
      currency,
    ]);
    costElement.innerHTML = `Cost: $<span class="value">${cost.toFixed(
      2
    )}</span>`;
    container.appendChild(costElement);

    const poweredByElement = document.createElement("div");
    const ttsEngine = voice.powered_by;
    const ttsLabel = getMessage("ttsPoweredBy", ttsEngine);
    poweredByElement.classList.add(
      "text-sm",
      "text-neutral-500",
      "saypi-powered-by"
    );
    poweredByElement.title = ttsLabel;
    const logoImageUrl = getResourceUrl(
      `icons/logos/${ttsEngine.toLowerCase()}.svg`
    );
    poweredByElement.innerHTML = `<img src="${logoImageUrl}" alt="${ttsLabel}" class="h-4 w-4 inline-block">`;
    costElement.appendChild(poweredByElement);
  }

  public static updateCostBasis(
    container: HTMLElement,
    characterCount: number,
    voice: SpeechSynthesisVoiceRemote
  ) {
    const costElement = container.querySelector(".saypi-cost .value");
    if (costElement) {
      const pricePer1kCharacters = voice.price;
      const cost = (characterCount / 1000) * pricePer1kCharacters;
      costElement.textContent = cost.toFixed(2);
    }
  }

  /**
   * Is this function necessary? See AudioModule.js
   * @param utterance
   */
  autoplaySpeech(utterance: SpeechSynthesisUtteranceRemote) {
    // wait a beat, then start streaming the utterance
    setTimeout(() => {
      this.speechSynthesis.speak(utterance);
    }, 1000);
  }
}
