/***** 설정 부분 *****/
const GITHUB = {
  owner: "littledoor-ai",
  repo: "survey-project",
  branch: "main",
  path: "images"
};

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzqJZ3wigSlnzpD24c5Dywn48IGjs9KP-BSkz-lUuhcorYj63_PZTJZUADk0QAazSF3/exec";

/*****************************************************/

const SAMPLE_SIZE = 23;
let currentImage = 0;
let responses = [];
let participant = { gender: "", age: "" };
let selectedImages = [];
const userID = generateUserID();

function generateUserID() {
  return 'xxxx-4xxx-yxxx-xxxx'.replace(/[xy]/g, c => {
    const r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
  });
}

function getImageID(url) {
  return url.split('/').pop();
}

function showPage(pageId) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(pageId).classList.add("active");
}

async function getImageList() {
  const api = `https://api.github.com/repos/${GITHUB.owner}/${GITHUB.repo}/git/trees/${GITHUB.branch}?recursive=1`;
  const res = await fetch(api);
  const data = await res.json();
  const exts = /\.(jpg|jpeg|png|webp)$/i;
  return data.tree
    .filter(item => item.type === "blob" && item.path.startsWith(`${GITHUB.path}/`) && exts.test(item.path))
    .map(item => `https://raw.githubusercontent.com/${GITHUB.owner}/${GITHUB.repo}/${GITHUB.branch}/${item.path}`);
}

async function initSurvey() {
  const allImages = await getImageList();
  const actualSampleSize = Math.min(SAMPLE_SIZE, allImages.length);
  selectedImages = allImages.sort(() => 0.5 - Math.random()).slice(0, actualSampleSize);
  currentImage = 0;
  responses = [];
  await loadImage();
}

function loadImage() {
  return new Promise((resolve, reject) => {
    const img = document.getElementById("survey-image");
    img.onload = () => {
      updateProgress();
      clearScoreSelection();
      resolve();
    };
    img.onerror = () => reject(new Error("이미지를 불러올 수 없습니다"));
    img.src = selectedImages[currentImage];
  });
}

function updateProgress() {
  document.getElementById("progress").textContent = 
    `${currentImage + 1} / ${selectedImages.length}`;
}

function clearScoreSelection() {
  document.querySelectorAll('input[name="score"]').forEach(r => r.checked = false);
}

async function nextQuestion() {
  const radios = document.querySelectorAll('input[name="score"]');
  let value = null;
  radios.forEach(r => { if (r.checked) value = r.value; });
  
  if (value === null) {
    alert("⚠️ 점수를 선택해주세요!");
    return;
  }

  responses.push({
    timestamp: new Date().toISOString(),
    userID,
    gender: participant.gender,
    age: participant.age,
    imageID: getImageID(selectedImages[currentImage]),
    score: parseInt(value)
  });

  if (currentImage >= selectedImages.length - 1) {
    await submitSurvey();
    return;
  }

  currentImage++;
  await loadImage();
}

async function prevQuestion() {
  if (currentImage > 0) {
    currentImage--;
    responses.pop();
    await loadImage();
  }
}

// ✅ JSONP 방식 제출
function submitSurvey() {
  return new Promise((resolve, reject) => {
    const callbackName = "jsonp_callback_" + Date.now();
    window[callbackName] = function(response) {
      console.log("서버 응답:", response);
      delete window[callbackName];
      script.remove();
      if (response.status === "success") {
        showPage("end-page");
        resolve(response);
      } else {
        reject(new Error(response.message || "Unknown error"));
      }
    };

    const data = { userID, participant, responses };
    const script = document.createElement("script");
    script.src = `${APPS_SCRIPT_URL}?callback=${callbackName}&data=${encodeURIComponent(JSON.stringify(data))}`;
    script.onerror = () => {
      delete window[callbackName];
      reject(new Error("JSONP 요청 실패"));
    };
    document.body.appendChild(script);
  });
}

// 이벤트 바인딩
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("startBtn").addEventListener("click", () => {
    const gender = document.querySelector('input[name="gender"]:checked');
    const age = document.getElementById("age").value;
    
    if (!gender || !age) {
      alert("⚠️ 성별과 연령대를 선택해주세요.");
      return;
    }
    
    participant.gender = gender.value;
    participant.age = age;
    
    showPage("survey-page");
    initSurvey();
  });
  
  document.getElementById("nextBtn").addEventListener("click", nextQuestion);
  document.getElementById("prevBtn").addEventListener("click", prevQuestion);
});
