import { buttonModule } from "./ButtonModule.js";
import { enterFullscreen, exitFullscreen } from "./FullscreenModule.ts";
import { UserPreferenceModule } from "./prefs/PreferenceModule.ts";
import { addChild } from "./DOMModule.ts";

function attachCallButton() {
  // move the call button back into the text prompt container for desktop view
  const container = document.getElementById("saypi-prompt-controls-container");
  const callButton = document.getElementById("saypi-callButton");
  if (container && callButton) {
    addChild(container, callButton, -1);
  }
}

function detachCallButton() {
  // remove the call button from the text prompt container while in mobile view
  const callButton = document.getElementById("saypi-callButton");
  if (callButton) {
    addChild(document.body, callButton);
  }
}

export class ImmersionService {
  /**
   * A service that manages the immersive view mode
   * Uses dependency injection to access the chatbot
   * @param {Chatbot} chatbot
   */
  constructor(chatbot) {
    this.chatbot = chatbot;
  }

  /**
   * Perform initial setup of the UI based on the view preferences
   */
  initMode() {
    UserPreferenceModule.getPrefersImmersiveView().then((immersive) => {
      if (immersive) {
        this.enterImmersiveMode();
      } else {
        ImmersionService.exitImmersiveMode();
      }
    });
  }

  // this function determines whether the immersive view is currently active
  static isViewImmersive() {
    const element = document.documentElement;
    return element.classList.contains("immersive-view");
  }

  static exitImmersiveMode() {
    localStorage.setItem("userViewPreference", "desktop"); // Save preference

    const element = document.documentElement;
    element.classList.remove("immersive-view");
    element.classList.add("desktop-view");

    attachCallButton();
    exitFullscreen();
  }

  enterImmersiveMode() {
    localStorage.setItem("userViewPreference", "immersive"); // Save preference

    // if not already on the talk page, navigate to it
    // this is to ensure the user is not stuck in the immersive view on a non-chat page
    const path = this.chatbot.getChatPath();
    if (window.location.pathname !== path) {
      window.location = path;
    }

    const element = document.documentElement;
    element.classList.remove("desktop-view");
    element.classList.add("immersive-view");

    detachCallButton();
    enterFullscreen();
    UserPreferenceModule.getTheme().then((theme) => {
      buttonModule.applyTheme(theme);
    });
  }
}