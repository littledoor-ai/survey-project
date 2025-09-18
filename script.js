// script.js (최종본, JSONP + 이벤트 연결 수정)

// GitHub Repo 이미지 불러오기 설정
const GITHUB = {
  owner: "littledoor-ai",
  repo: "survey-project",
  branch: "main",
  path: "images"
};

// Google Apps Script URL
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzqJZ3wigSlnzpD24c5Dywn48IGjs9KP-BSkz-lUuhcorYj63_PZTJZUADk0QAazSF3/exec";

// 전역 상태
let userID = generateUserID();
let participant = { gender: null, age: null };
let responses = [];
let allImages = [];
let currentIndex = 0;

// 샘플 크기
const SAMPLE_SIZE = 23;

// 사용자 ID 생성
function generateUserID() {
  return 'xxxx-xxxx-xxxx-xxxx'.replace(/[x]/g, () =>
    Math.floor(Math.random() * 16).toString(16)
  );
}

// 페이지 표시
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  document.getElementById(pageId).classList.remove('hidden');
}

// 설문 시작
function startSurvey() {
  const genderEl = document.querySelector('input[name="gender"]:checked');
  const age = document.getElementById("age").value;

  if (!genderEl || !age) {
    alert("⚠️ 성별과 연령대를 선택해주세요.");
    return;
  }

  participant.gender = genderEl.value;
  participant.age = age;

  loadImages().then(() => {
    currentIndex = 0;
    responses = [];
    showQuestion();
    showPage("survey-page");
  });
}

// GitHub에서 이미지 로드
async function loadImages() {
  const url = `https://api.github.com/repos/${GITHUB.owner}/${GITHUB.repo}/git/trees/${GITHUB.branch}?recursive=1`;
  const res = await fetch(url);
  const data = await res.json();

  allImages = data.tree
    .filter(f => f.path.startsWith(GITHUB.path) && f.path.match(/\.(jpg|jpeg|png|gif)$/i))
    .map(f => `https://raw.githubusercontent.com/${GITHUB.owner}/${GITHUB.repo}/${GITHUB.branch}/${f.path}`);

  // 랜덤 샘플링
  allImages = allImages.sort(() => 0.5 - Math.random()).slice(0, SAMPLE_SIZE);
}

// 질문 표시
function showQuestion() {
  if (currentIndex >= allImages.length) {
    finishSurvey();
    return;
  }

  const imgEl = document.getElementById("survey-image");
  imgEl.src = allImages[currentIndex];
  document.getElementById("progress").innerText = `${currentIndex + 1} / ${allImages.length}`;
}

// 응답 저장 후 다음 질문
function nextQuestion() {
  const scoreEl = document.querySelector('input[name="score"]:checked');
  if (!allImages[currentIndex] || !scoreEl) {
    alert("⚠️ 점수를 선택해주세요!");
    return;
  }

  responses.push({
    timestamp: new Date().toISOString(),
    userID,
    gender: participant.gender,
    age: participant.age,
    imageID: allImages[currentIndex],
    score: parseInt(scoreEl.value)
  });

  currentIndex++;
  showQuestion();
}

// 이전 질문
function prevQuestion() {
  if (currentIndex > 0) {
    currentIndex--;
    responses.pop(); // 마지막 응답 제거
    showQuestion();
  }
}

// JSONP 방식으로 서버에 설문 응답 제출
function submitSurvey(data) {
  return new Promise((resolve, reject) => {
    const callbackName = "jsonp_callback_" + Date.now();

    // 콜백 등록
    window[callbackName] = function(response) {
      console.log("서버 응답:", response);

      // cleanup
      delete window[callbackName];
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }

      if (response.status === "success") {
        resolve(response);
      } else {
        reject(new Error(response.message || "Unknown error"));
      }
    };

    // script 태그로 JSONP 호출
    const script = document.createElement("script");
    script.src = `${APPS_SCRIPT_URL}?callback=${callbackName}&data=${encodeURIComponent(JSON.stringify(data))}`;
    script.onerror = () => {
      delete window[callbackName];
      reject(new Error("JSONP 요청 실패"));
    };
    document.body.appendChild(script);
  });
}

// 설문 종료 및 제출
async function finishSurvey() {
  try {
    const result = await submitSurvey({
      userID,
      participant,
      responses
    });
    console.log("제출 성공:", result);
    showPage("end-page");
  } catch (err) {
    console.error("제출 오류:", err);
    alert("제출 중 오류가 발생했습니다. 다시 시도해주세요.");
  }
}

// DOM 로드 후 이벤트 바인딩
window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("startBtn").addEventListener("click", startSurvey);
  document.getElementById("nextBtn").addEventListener("click", nextQuestion);
  document.getElementById("prevBtn").addEventListener("click", prevQuestion);

  // 키보드 단축키
  document.addEventListener("keydown", (e) => {
    if (!document.getElementById("survey-page").classList.contains("hidden")) {
      if (e.key >= "0" && e.key <= "9") {
        const radio = document.querySelector(`input[name="score"][value="${e.key}"]`);
        if (radio) radio.checked = true;
      } else if (e.key === "Enter") {
        e.preventDefault();
        nextQuestion();
      }
    }
  });

  console.log("사용자 ID:", userID);
  console.log("Apps Script URL:", APPS_SCRIPT_URL);
});
