const totalImages = 740;
const sampleSize = 23;
const imageFolder = "images/";
const sheetUrl = "https://script.google.com/macros/s/AKfycbz9TmijBEyrgM0vS4nh5E3HimRTxrZfx8Zq3vL_iPx3lUED3cJn-lBxEOI76Gz3VCW_/exec";

function getRandomImages() {
  const indices = [];
  while (indices.length < sampleSize) {
    const rand = Math.floor(Math.random() * totalImages) + 1;
    if (!indices.includes(rand)) indices.push(rand);
  }
  return indices.map(i => `${imageFolder}${i}.jpg`);
}

function renderSurvey() {
  const surveyDiv = document.getElementById("survey");
  const images = getRandomImages();
  images.forEach((src, idx) => {
    const qDiv = document.createElement("div");
    qDiv.className = "question";
    qDiv.innerHTML = `
      <img src="${src}" alt="survey image ${idx+1}">
      <div class="score-label"><span>0 (매우 위험)</span><span>10 (매우 안전)</span></div>
      <input type="range" min="0" max="10" value="5" name="q${idx}" step="1">
    `;
    surveyDiv.appendChild(qDiv);
  });
}

function submitSurvey() {
  const inputs = document.querySelectorAll("input[type=range]");
  const responses = {};
  inputs.forEach((input, idx) => {
    responses[`q${idx+1}`] = input.value;
  });
  fetch(sheetUrl, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(responses)
  }).then(() => {
    alert("응답이 저장되었습니다. 감사합니다!");
  });
}

window.onload = renderSurvey;