let defaultEngineVersions = {
  ada: "text-ada-001",
  baggage: "text-baggage-001",
  curie: "text-curie-001",
  davinci: "text-davinci-003",
};

let defaultCompletion = {
  high: 80,
  low: 40,
};

// First, check to see if an OpenAI API key exists and if it is valid
chrome.runtime.onInstalled.addListener((reason) => {
  // Set default preferences
  chrome.storage.sync.set({
    API_KEY: "",
    ENGINE: "davinci",
    COMPLETION: "low",
    TEMPERATURE: 0.2,
  });
});

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  // First get the API key from storage
  chrome.storage.sync.get(
    ["API_KEY", "ENGINE", "COMPLETION", "TEMPERATURE"],
    function (result) {
      const data = {
        model: defaultEngineVersions[result.ENGINE],
        prompt: message["prompt"],
        max_tokens: defaultCompletion[result.COMPLETION],
        temperature: result.TEMPERATURE,
      };

      fetch("https://api.openai.com/v1/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: "Bearer " + result.API_KEY,
        },
        body: JSON.stringify(data),
      })
        .then((response) => response.json())
        .then((data) => {
          sendResponse(data);
        })
        .catch((error) => {
          sendResponse({ error: error });
        });
    }
  );
  return true;
});
