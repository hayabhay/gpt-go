function renderMenu() {
  chrome.storage.sync.get("API_KEY", function (result) {
    if (result.API_KEY) {
      // Show the regular popup
      document.getElementById("setup").classList.add("d-none");
      document.getElementById("preferences").classList.remove("d-none");
      // Load selected preferences
      chrome.storage.sync.get(
        ["ENGINE", "COMPLETION", "TEMPERATURE"],
        function (result) {
          document.getElementById("engine").value = result.ENGINE;

          // Set the max tokens
          let completionId = "completion-" + result.COMPLETION;
          document.getElementById(completionId).checked = true;

          // Set the temperature
          document.getElementById("temperature").value = result.TEMPERATURE;
          document.getElementById("temperature-display").textContent =
            result.TEMPERATURE;
        }
      );
    } else {
      // Show the options page
      document.getElementById("setup").classList.remove("d-none");
      document.getElementById("preferences").classList.add("d-none");
    }
  });
}

function testAPIKey() {
  chrome.storage.sync.get("API_KEY", function (result) {
    let apiKey = result.API_KEY;
    let saveBtn = document.getElementById("save-key");

    if (apiKey) {
      // Fetch a list of models from openai to check
      // if the API key is valid
      fetch("https://api.openai.com/v1/models", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: "Bearer " + apiKey,
        },
      })
        .then((response) => response.json())
        .then((data) => {
          console.log(data);
          if (data.error) {
            // If the API key is invalid, then prompt the user to enter a new one
            saveBtn.textContent = "Invalid!";
            chrome.storage.sync.set(
              {
                API_KEY: "",
              },
              function () {
                setTimeout(function () {
                  saveBtn.textContent = "Save";
                }, 2000);
              }
            );
          } else {
            // Update status to let user know options were saved.
            saveBtn.textContent = "Saved!";
            setTimeout(function () {
              // Update popup elements
              renderMenu();
            }, 1000);
          }
        });
    }
  });
}

document.addEventListener("DOMContentLoaded", function () {
  // Render the menu
  renderMenu();

  // Get API key button
  document.getElementById("key-cta").addEventListener("click", function () {
    chrome.tabs.create({
      url: "https://beta.openai.com/account/api-keys",
      active: true,
    });
  });
  // Event handler to save the API key
  document.getElementById("save-key").addEventListener("click", function () {
    var key = document.getElementById("api-key").value;
    chrome.storage.sync.set(
      {
        API_KEY: key,
      },
      function () {
        // Test the API key
        testAPIKey(key);
      }
    );
  });

  document.getElementById("engine").addEventListener("change", function () {
    console.log("changed");
    let engine = document.getElementById("engine").value;
    chrome.storage.sync.set({ ENGINE: engine });
  });

  document
    .getElementById("completion-cta")
    .addEventListener("click", function () {
      let completion = document.querySelector(
        'input[name="completion"]:checked'
      ).value;
      chrome.storage.sync.set({ COMPLETION: completion });
    });

  document.getElementById("temperature").addEventListener("click", function () {
    let temperature = document.getElementById("temperature").value;
    // convert to float
    temperature = parseFloat(temperature);
    chrome.storage.sync.set(
      {
        TEMPERATURE: temperature,
      },
      function () {
        document.getElementById("temperature-display").textContent =
          temperature;
      }
    );
  });
});
