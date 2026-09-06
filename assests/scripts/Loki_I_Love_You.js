const API_ENDPOINT = "https://dog.ceo/api/breed/shihtzu/images/random";

async function fetch_shihtzu() {
  try {
    const RESPONSE = await fetch(API_ENDPOINT);
    if (!RESPONSE.ok) {
      throw new Error(`HTTP error! status: ${RESPONSE.status}`);
    }
    const MESSAGE = await RESPONSE.text();
    var URL = JSON.parse(MESSAGE).message;
    console.log(URL);
    return URL;
  } catch (error) {
    console.error("Error fetching JSON", error);
  }
}

async function construct_image(src) {
  const CONTAINER = document.getElementById("dog-container");
  const IMAGE = document.createElement("img");

  IMAGE.src = src;
  CONTAINER.appendChild(IMAGE);
}

async function main() {
  const src = await fetch_shihtzu();
  await construct_image(src);
}

main();
