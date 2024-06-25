"use strict";
(self["webpackChunksaypi_userscript"] = self["webpackChunksaypi_userscript"] || []).push([[354],{

/***/ 5354:
/***/ ((module) => {

module.exports = JSON.parse('{"activityCheckButton":{"description":"Texten på knappen för att indikera att användaren fortfarande är närvarande.","message":"Ja, jag är fortfarande här!"},"activityCheckMessage":{"description":"Meddelandet som ska visas när konversationen har pågått ovanligt länge.","message":"Oj, det här är ett långt samtal. Är du fortfarande där, eller pratar vi med oss själva?"},"allowInterruptions":{"description":"Etikett för kryssrutan för att aktivera/inaktivera möjligheten för användaren att avbryta Pi:s svar genom att tala.","message":"Avbrytbar"},"appDescription":{"description":"Beskrivning av applikationen.","message":"Din Röststyrda Kamrat för Pi AI"},"appName":{"description":"Namnet på applikationen.","message":"Säg, Pi"},"applicationStatusIssue":{"description":"Meddelande att visa när applikationen upplever problem.","message":"Systemfelvarning"},"applicationStatusUnknown":{"description":"Meddelande att visa när applikationsstatus inte kan bestämmas. T.ex. när klienten är offline.","message":"Ansökningsstatus okänd"},"assistantIsListening":{"description":"Meddelande som visas när assistenten lyssnar efter tal.","message":"$chatbot$ lyssnar...","placeholders":{"chatbot":{"content":"$1","example":"Pi"}}},"assistantIsSpeaking":{"description":"Meddelande som visas när assistenten talar sitt svar.","message":"$chatbot$ talar...","placeholders":{"chatbot":{"content":"$1","example":"Pi"}}},"assistantIsThinking":{"description":"Meddelande som visas när assistenten förbereder sitt svar.","message":"$chatbot$ tänker...","placeholders":{"chatbot":{"content":"$1","example":"Pi"}}},"audioConnected":{"description":"Meddelande som visas när en mikrofon är ansluten","message":"$microphone$ ansluten","placeholders":{"microphone":{"content":"$1","example":"Default - MacBook Pro Microphone"}}},"audioInputError":{"description":"Meddelande som visas när ljud resulterade i en tom transkription - vanligtvis resultatet av filtrering.","message":"Oj, $chatbot$ fångade inte det. Kan du försöka säga det igen?","placeholders":{"chatbot":{"content":"$1","example":"Pi"}}},"audioReconnecting":{"description":"Meddelande som visas när du ansluter till en ny mikrofon","message":"Byter till $microphone$...","placeholders":{"microphone":{"content":"$1","example":"Default - AirPods Pro"}}},"autoSubmit":{"description":"Etikett för kryssrutan för att aktivera/inaktivera automatisk inlämning av uppmaning.","message":"Automatisk inlämning"},"callError":{"description":"Verktygstipset som visas på samtalsknappen när ett icke-kritiskt fel inträffar.","message":"Icke-dödligt fel uppstod. Oroa dig inte, vi lyssnar fortfarande."},"callInProgress":{"description":"Den tooltip som ska visas på samtalsknappen när ett samtal pågår.","message":"Aktiv kontinuerlig lyssning. Klicka för att stoppa."},"callNotStarted":{"description":"Den tooltip som ska visas på samtalsknappen innan ett samtal startas.","message":"Klicka för att starta kontinuerlig lyssning."},"callStarting":{"description":"Texten som ska visas på samtalsknappens verktygstips och i promptområdet när ett samtal startar.","message":"Ansluter..."},"checkingApplicationStatus":{"description":"Meddelande att visa medan systemstatus bestäms, t.ex. under belastning.","message":"Kontrollerar applikationsstatus..."},"consentAskParticipate":{"message":"Vill du delta?"},"consentBetterTogether":{"message":"Låt oss förbättra Say, Pi tillsammans"},"consentDataDeidentified":{"message":"Analys är inte kopplad till individer. All data som används är avidentifierad."},"consentNoPii":{"message":"Vi kommer inte att samla in eller se personuppgifter, som meddelanden eller namn."},"consentNoSale":{"message":"Vi kommer inte att sälja dina data till tredje part, eller använda den för reklam."},"consentOptIn":{"message":"Jag är med!"},"consentOptOut":{"message":"Ingen tack"},"consentPrivacyParamount":{"message":"Din integritet är av yttersta vikt. Allt du säger stannar mellan dig och Pi."},"consentRightToRevoke":{"message":"Du kan ändra dig när som helst."},"consentSharingPurpose":{"message":"Att dela din användardata hjälper oss att förstå hur människor använder Say, Pi så vi kan göra det bättre för alla."},"consetPrivacyPolicy":{"message":"Läs vår sekretesspolicy"},"continueUnlocking":{"description":"Instruktioner som berättar för användaren hur man fortsätter när de har börjat trycka på lås upp-knappen.","message":"Fortsätt hålla för att låsa upp..."},"currencyUSDAbbreviation":{"description":"Förkortningen för United States Dollar.","message":"USD"},"currentCharges":{"description":"Termen som används för att beskriva de nuvarande avgifterna (löpande total) som användaren har upparbetat.","message":"Aktuella avgifter"},"dismissAlert":{"description":"Etikett för knappen för att avfärda ett systemproblemvarning.","message":"Avfärda"},"enableTTS":{"description":"Etikett för kryssrutan för att aktivera/inaktivera text-till-tal.","message":"Flerspråkiga röster"},"enhancedVoice":{"description":"Titel (verktygstips) för Say, Pi förbättrade röster.","message":"Röst förbättrad av Say, Pi"},"enterImmersiveModeLong":{"description":"Aria-label och titel på knappen för att gå in i omslutande läge på mobila enheter.","message":"Ange Immersivt Läge"},"enterImmersiveModeShort":{"description":"Texten på knappen för att gå in i omslutande läge på skrivbordet.","message":"Uppslukande"},"exitImmersiveModeLong":{"description":"Aria-label och titeln på knappen för att avsluta det inlevelsefulla läget på mobila enheter, tillbaka till textbaserat skrivbordsläge.","message":"Avsluta immersivt läge"},"extensionPopupTitle":{"description":"Titeln på tilläggets popup-dialog.","message":"Säg, Pi-inställningar"},"lockButton":{"description":"Titeln (verktygstipset) på knappen för att låsa skärmen mot oavsiktliga beröringar.","message":"Tryck för att låsa skärmen"},"lockedScreen":{"description":"Ett meddelande att visa framträdande när skärmen är låst.","message":"Skärmen är låst."},"mode_accuracy":{"description":"Högsta noggrannhetsläge.","message":"noggrannhet"},"mode_balanced":{"description":"Standard transkriptionsläge.","message":"balanserad"},"mode_speed":{"description":"Snabbaste transkriptionsläget.","message":"hastighet"},"preferedLanguage":{"description":"Etikett för en kontroll för att välja det föredragna transkriptionsspråket.","message":"Språk"},"preferedModeControl":{"description":"Titeln (verktygstipset) för kontrollen att välja den föredragna transkriptionsläget.","message":"Välj ditt föredragna transkriptionsläge"},"previewProgress":{"description":"Meddelandet som ska visas när användaren förhandsgranskar en funktion som har en teckengräns.","message":"$count$ tecken använda av $limit$","placeholders":{"count":{"content":"$1","example":"123"},"limit":{"content":"$2","example":"500"}}},"previewStatusActive":{"message":"Beta Aktiv"},"previewStatusCompleted":{"message":"Beta Slutförd"},"previewStatusPaused":{"description":"Meddelandet som ska visas när användaren förhandsgranskar en funktion som har pausats.","message":"Beta Pausad tills $resetDate$","placeholders":{"resetDate":{"content":"$1","example":"2021-12-31"}}},"previewStatusUnknown":{"message":"Kan inte ansluta..."},"readAloudButtonTitle":{"description":"Titeln på knappen för att läsa upp texten i ett meddelande.","message":"Läs Högt"},"recommendedActions":{"description":"Meddelande före en lista över rekommenderade åtgärder som användaren kan vidta för att åtgärda ett känt problem.","message":"Under tiden rekommenderar vi:"},"shareAnalytics":{"description":"Etikett för kryssrutan för att aktivera/inaktivera delning av analysdata.","message":"Dela analysdata"},"soundEffects":{"description":"Etikett för kryssrutan för att aktivera/inaktivera ljudeffekter.","message":"Ljudeffekter"},"toggleThemeToDarkMode":{"description":"Etikett för knappen att växla till mörkt läge.","message":"Byt till mörkt läge"},"toggleThemeToLightMode":{"description":"Etikett för knappen att växla till ljusläge.","message":"Byt till ljusläge"},"ttsCostExplanation":{"description":"Den tooltip som ska visas när text-till-tal-motorn används för att läsa upp ett meddelande, med kostnaden för meddelandet.","message":"Kostnaden för att lyssna på detta meddelande är $cost$ $currency$","placeholders":{"cost":{"content":"$1","example":"0.01"},"currency":{"content":"$2","example":"credits"}}},"ttsCostExplanationFree":{"description":"Verktygstipset som visas när en text-till-tal-motor används för att läsa upp ett meddelande, och meddelandet är gratis. Kan innehålla namnet på leverantören.","message":"Detta ljud genererades gratis.","placeholders":{"provider":{"content":"$1","example":"Inflection AI"}}},"ttsPoweredBy":{"description":"Meddelandet som ska visas när text-till-tal-motorn används för att läsa upp ett meddelande högt.","message":"Text-till-tal drivet av $ttsEngine$","placeholders":{"ttsEngine":{"content":"$1","example":"ElevenLabs"}}},"unlockButton":{"description":"Titeln (verktygstips) på knappen för att låsa upp skärmen.","message":"Tryck för att låsa upp skärmen"},"unlockInstruction":{"description":"Instruktioner som berättar för användaren hur man låser upp skärmen när den är låst.","message":"Håll för att låsa upp."},"userStartedInterrupting":{"description":"Meddelande som visas när användaren börjar prata medan assistenten talar.","message":"Kör på, $chatbot$ lyssnar...","placeholders":{"chatbot":{"content":"$1","example":"Pi"}}}}');

/***/ })

}]);