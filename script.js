const imageCount = 740;
const images = Array.from({length: imageCount}, (_, i) => `images/${i+1}.jpg`);

// 무작위 23장 샘플링
const sampledImages = images.sort(() => 0.5 - Math.random()).slice(0, 23);

let currentIndex = 0;
let responses = [];

function startSurvey() {
  document.getElementById('intro-page').classList.remove('active');
  document.getElementById('question-page').classList.add('active');
  showImage();
}

function showImage() {
  document.getElementById('survey-image').src = sampledImages[currentIndex];
  document.getElementById('progress-text').innerText =
    `이미지 ${currentIndex+1} / ${sampledImages.length}`;
  document.getElementById('score-slider').value = 5;
}

function nextImage() {
  const score = document.getElementById('score-slider').value;
  responses.push({image: sampledImages[currentIndex], score: score});
  currentIndex++;

  if (currentIndex < sampledImages.length) {
    showImage();
  } else {
    submitSurvey();
  }
}

function submitSurvey() {
  document.getElementById('question-page').classList.remove('active');
  document.getElementById('end-page').classList.add('active');

  // Google Apps Script로 전송
  fetch("https://script.google.com/macros/s/AKfycbz9TmijBEyrgM0vS4nh5E3HimRTxrZfx8Zq3vL_iPx3lUED3cJn-lBxEOI76Gz3VCW_/exec", {
    method: "POST",
    mode: "no-cors",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(responses)
  });
}
