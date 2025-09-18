// script.js (JSONP 버전)

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
  const gender = document.getElementById("gender").value;
  const age = document.getElementById("age").value;

  if (!gender || !age) {
    alert("성별과 연령대를 선택해주세요.");
    return;
  }

  participant.gender = gender;
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
function nextQuestion(score) {
  if (!allImages[currentIndex]) return;

  responses.push({
    timestamp: new Date().toISOString(),
    imageID: allImages[currentIndex],
    score: score
  });

  currentIndex++;
  showQuestion();
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
    showPage("done-page");
  } catch (err) {
    console.error("제출 오류:", err);
    alert("제출 중 오류가 발생했습니다. 다시 시도해주세요.");
  }
}

// 키보드 단축키
window.addEventListener("keydown", (e) => {
  if (document.getElementById("survey-page").classList.contains("hidden")) return;

  if (e.key >= 1 && e.key <= 7) {
    nextQuestion(parseInt(e.key));
  } else if (e.key === "Enter") {
    nextQuestion(4);
  }
});

// 초기 로그
console.log("사용자 ID:", userID);
console.log("Apps Script URL:", APPS_SCRIPT_URL);
