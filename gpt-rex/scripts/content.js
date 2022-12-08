// Comms between content script and background script
// ------------------------------
function openaiCompleteText(prompt) {
  console.log("OpenAI complete text triggered");
  chrome.runtime.sendMessage(
    {
      function: "complete",
      prompt: prompt,
    },
    function (response) {
      if (response["error"]) {
        console.log(response["error"]);
        mediumStatusUpdate("error");
      } else {
        console.log("Response received successfully");
        mediumUpdateDOM(response.choices[0].text);
      }
    }
  );
}

// Medium specific handlers
// ------------------------
function mediumGetPrompt(article) {
  // Initialize the prompt
  let promptLines = [];

  // First get all sections
  const sections = article.querySelectorAll("section");

  let reachedSelected = false;
  // Iterate over each section and get text until the cursor
  for (let section of sections) {
    // Get the text content of the section
    // Ignore blockquotes & code blocks for now
    // All lists are converted to unordered lists for now
    const innerElements = section
      .querySelector(".section-inner")
      .querySelectorAll("p, h1, h2, h3, h4, h5, h6, li");

    for (let element of innerElements) {
      // Get the text content of the element
      let text = element.textContent;
      // Use only the first character of the tag.
      // This is mainly because additional elements aren't added to the DOM
      let tagName = element.tagName[0];
      // Create a prompt for the element
      // prompt += `${tagName}~${text}\n`;
      promptLines = promptLines.concat(text);

      // If element has an "is-selected" class, then we've reached the cursor
      // It isn't clear how to extract the cursor position from the DOM
      // So we'll just assume that the cursor is at the end of the element
      if (element.classList.contains("is-selected")) {
        reachedSelected = true;
        break;
      }
    }
    // If we've reached the cursor, break out of the loop
    if (reachedSelected) {
      break;
    }
  }

  // Traverse the prompt lines in reverse and count the number of words and stop at 1000
  let prompt = "";
  let wordCount = 0;
  for (let i = promptLines.length - 1; i >= 0; i--) {
    let line = promptLines[i];
    let words = line.split(" ");
    wordCount += words.length;
    if (wordCount > 1000) {
      break;
    }
    prompt = `${line}\n${prompt}`;
  }

  return prompt.trim();
}

function mediumUpdateDOM(text) {
  // Insert the response into the DOM
  // TODO: Add more structure later
  // Trying to directly insert text into Medium DOM breaks it. It might be worth investigating
  // but for now, no new elements are added but only the current section is updated.
  let lines = text.split("\n");

  let completion = "";
  for (let line of lines) {
    if (line.trim() !== "") {
      completion += `${line} `;
    }
  }

  // For now, simply append the entire text to the end of the article
  const element = document
    .querySelector("article")
    .querySelector(".is-selected");
  element.textContent = element.textContent.slice(0, -1);

  // if there is no completion, then flash a useful message
  if (completion.trim() === "") {
    mediumStatusUpdate("nosuggestion");
  } else {
    element.textContent += completion;
  }

  // Erm.. This piece of code was entirely written by Co-Pilot and it worked but no idea why.
  // AI giveth, AI taketh away.
  // --------------------------
  // Set cursor position to the end for the editable element
  // https://stackoverflow.com/questions/4233265/contenteditable-set-caret-at-the-end-of-the-text-cross-browser
  let range = document.createRange();
  let sel = window.getSelection();
  range.setStart(element, element.childNodes.length);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
  element.focus();
  // --------------------------
}

function mediumStatusUpdate(status) {
  // Get the element
  const element = document
    .querySelector("article")
    .querySelector(".is-selected");

  let message = "";

  if (status === "wait") {
    element.textContent += "⏳";
  } else if (status === "error") {
    message = "❌ error ❌";
    // Remove the waiting icon
    element.textContent = element.textContent.slice(0, -1);
    // flash a red icon and say "fail" and then remove it
    element.textContent += message;
    setTimeout(() => {
      element.textContent = element.textContent.slice(0, -message.length);
    }, 1000);
  } else if (status === "setup") {
    // flash a red icon with a message and then remove it
    message = "⚠️ set API key ⚠️";
    element.textContent += message;
    setTimeout(() => {
      element.textContent = element.textContent.slice(0, -message.length);
    }, 1000);
  } else if (status === "nosuggestion") {
    // flash a no suggestion message and then remove it
    message = "⚠️ no suggestions. type more & try again ⚠️";
    element.textContent += message;
    setTimeout(() => {
      element.textContent = element.textContent.slice(0, -message.length);
    }, 1500);
  }
}

function triggerMediumAssist(event) {
  console.log("Medium assist triggered");

  // Check to see if the web page has an article element
  const article = document.querySelector("article");

  if (article) {
    // Check if API key is set
    chrome.storage.sync.get(["API_KEY"], function (result) {
      if (result["API_KEY"] === "") {
        mediumStatusUpdate("setup");
        return;
      } else {
        const prompt = mediumGetPrompt(article);

        // make a call to openai
        openaiCompleteText(prompt);
        // Render a waiting animation
        mediumStatusUpdate("wait");
      }
    });
  } else {
    console.log("No article found");
  }
}

document.addEventListener("keydown", function (event) {
  // Check if the 'ctrl' and 's' keys were pressed to trigger the extension
  if (event.ctrlKey && event.key === ">") {
    // Prevent the default action
    event.preventDefault();

    // First get the domain name of the current page
    const domain = window.location.hostname;

    // Next, call domain specific prompt generators
    if (domain === "medium.com") {
      triggerMediumAssist(event);
    }
  }
});
