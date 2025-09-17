const totalImages = 740;
const sampleSize = 23;
let images = [];
for (let i = 1; i <= totalImages; i++) {
  images.push(`images/${i}.jpg`);
}
let sample = [];
let currentIndex = 0;
let answers = [];

document.getElementById("start-btn").onclick = () => {
  sample = images.sort(() => 0.5 - Math.random()).slice(0, sampleSize);
  document.getElementById("intro-page").style.display = "none";
  document.getElementById("survey-page").style.display = "block";
  showQuestion(0);
};

function showQuestion(index) {
  currentIndex = index;
  let container = document.getElementById("question-container");
  let img = sample[index];

  let scale = "";
  for (let i = 0; i <= 10; i++) {
    scale += `<label><input type="radio" name="q${index}" value="${i}" ${answers[index]==i?"checked":""}>${i}</label>`;
  }

  container.innerHTML = `
    <h3>이 장소에서 보행할 때 느끼는 교통사고 위험 수준을 평가해 주세요.</h3>
    <p>(0 = 매우 위험하다, 10 = 매우 안전하다)</p>
    <div class="image-container"><img src="${img}" alt="image"></div>
    <div class="likert-scale">${scale}</div>
  `;

  updateProgress();
}

function updateProgress() {
  let percent = ((currentIndex+1) / sampleSize) * 100;
  document.getElementById("progress-bar").style.width = percent + "%";
}

document.getElementById("next-btn").onclick = () => {
  let selected = document.querySelector(`input[name="q${currentIndex}"]:checked`);
  if (selected) answers[currentIndex] = selected.value;
  if (currentIndex < sampleSize-1) {
    showQuestion(currentIndex+1);
  } else {
    submitSurvey();
  }
};

document.getElementById("prev-btn").onclick = () => {
  if (currentIndex > 0) {
    showQuestion(currentIndex-1);
  }
};

function submitSurvey() {
  const url = "YOUR_GOOGLE_SCRIPT_URL";
  let payload = { answers: answers, images: sample };

  fetch(url, {
    method: "POST",
    mode: "no-cors",
    cache: "no-cache",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  document.getElementById("survey-page").style.display = "none";
  document.getElementById("end-page").style.display = "block";
}
