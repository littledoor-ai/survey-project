/***** ✅ 사용자가 직접 수정해야 하는 부분 *****/
// 깃허브 저장소 정보 입력
const GITHUB = {
  owner: "littledoor-ai",      // ✅ 본인 깃허브 ID
  repo: "survey-project",       // ✅ 저장소 이름
  branch: "main",               // ✅ 브랜치 (보통 main)
  path: "images"                // ✅ 이미지 폴더 이름
};

// Google Apps Script Web App URL 입력
// ✅ Apps Script 코드를 수정한 후 새 배포 URL을 여기에 붙여넣으세요.
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx5JmMq0hgtbdg61sc3SRsMjxqY9uWd4aL7rU3p9MwWLOpdSoWpfRqrdC6y0WfJSwdf/exec";

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

// 페이지 전환
function showPage(pageId) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(pageId).classList.add("active");
}

// 이미지 목록 불러오기 (GitHub API)
async function getImageList() {
  const api = `https://api.github.com/repos/${GITHUB.owner}/${GITHUB.repo}/git/trees/${GITHUB.branch}?recursive=1`;
  const res = await fetch(api);
  const data = await res.json();

  const exts = /\.(jpg|jpeg|png|webp)$/i;
  const images = data.tree
    .filter(item => item.type === "blob" && item.path.startsWith(`${GITHUB.path}/`) && exts.test(item.path))
    .map(item => `https://raw.githubusercontent.com/${GITHUB.owner}/${GITHUB.repo}/${GITHUB.branch}/${item.path}`);
  
  return images;
}

// 설문 초기화
async function initSurvey() {
  const allImages = await getImageList();
  selectedImages = allImages.sort(() => 0.5 - Math.random()).slice(0, SAMPLE_SIZE);
  currentImage = 0;
  responses = [];
  await loadImage();
}

// 이미지 로딩
function loadImage() {
  const img = document.getElementById("survey-image");
  img.src = selectedImages[currentImage];
  updateProgress();
  clearScoreSelection();
}

// 진행상황 업데이트
function updateProgress() {
  document.getElementById("progress").textContent = 
    `${currentImage + 1} / ${selectedImages.length}`;
}

// 점수 선택 초기화
function clearScoreSelection() {
  document.querySelectorAll('input[name="score"]').forEach(r => r.checked = false);
}

// 다음 질문
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
  loadImage();
}

// 이전 질문
function prevQuestion() {
  if (currentImage > 0) {
    currentImage--;
    responses.pop();
    loadImage();
  }
}

// ✅ 제출 함수 (JSONP 방식으로 수정)
async function submitSurvey() {
  const submitData = {
    participant,
    userID,
    responses
  };

  const url = `${APPS_SCRIPT_URL}?callback=handleResponse&data=${encodeURIComponent(JSON.stringify(submitData))}`;
  
  // JSONP 응답을 처리할 글로벌 함수 정의
  window.handleResponse = function(result) {
    if (result.status === "success") {
      showPage("end-page");
    } else {
      alert("제출 중 오류 발생: " + result.message);
    }
  };

  // 동적으로 script 태그를 생성하여 JSONP 요청
  const script = document.createElement('script');
  script.src = url;
  document.body.appendChild(script);
  
  // 요청 완료 후 script 태그 제거
  script.onload = () => {
    document.body.removeChild(script);
    delete window.handleResponse;
  };
  script.onerror = () => {
    alert("네트워크 오류가 발생했습니다.");
    document.body.removeChild(script);
    delete window.handleResponse;
  };
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