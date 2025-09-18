/***** ✅ 사용자가 직접 수정해야 하는 부분 *****/
// 깃허브 저장소 정보 입력
const GITHUB = {
  owner: "littledoor-ai",      // ✅ 본인 깃허브 ID
  repo: "survey-project",       // ✅ 저장소 이름
  branch: "main",               // ✅ 브랜치 (보통 main)
  path: "images"                // ✅ 이미지 폴더 이름
};

// Google Apps Script Web App URL 입력
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyGty9pkBmL-G7tQ4n35TyVULAE1CmigwWd1ORMAiranMRhMluz_K9m6NBqZuyYPU4I/exec"; // ✅ 여기 붙여넣기

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

// --- 이미지 목록 가져오기 (GitHub API) ---
async function getImageList() {
  const api = `https://api.github.com/repos/${GITHUB.owner}/${GITHUB.repo}/git/trees/${GITHUB.branch}?recursive=1`;
  const res = await fetch(api);
  const data = await res.json();
  const exts = /\.(jpg|jpeg|png|webp)$/i;
  return data.tree
    .filter(item => item.type === "blob" && item.path.startsWith(`${GITHUB.path}/`) && exts.test(item.path))
    .map(item => `https://raw.githubusercontent.com/${GITHUB.owner}/${GITHUB.repo}/${GITHUB.branch}/${item.path}`);
}

// --- 설문 시작 ---
async function initSurvey() {
  const allImages = await getImageList();
  selectedImages = allImages.sort(() => 0.5 - Math.random()).slice(0, SAMPLE_SIZE);
  currentImage = 0;
  responses = [];
  loadImage();
}

// --- 페이지 전환 ---
function showPage(pageId) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(pageId).classList.add("active");
  if (pageId === "survey-page") initSurvey();
}

function validateDemographics() {
  const gender = document.querySelector('input[name="gender"]:checked');
  const age = document.getElementById("age").value;
  if (!gender || !age) {
    alert("⚠️ 성별과 연령대를 선택해주세요.");
    return;
  }
  participant.gender = gender.value;
  participant.age = age;
  showPage("survey-page");
}

// --- 이미지 로딩 ---
function loadImage() {
  if (currentImage < selectedImages.length) {
    document.getElementById("survey-image").src = selectedImages[currentImage];
    document.getElementById("progress").innerText = `${currentImage + 1} / ${selectedImages.length}`;
    document.querySelectorAll('input[name="score"]').forEach(r => r.checked = false);
  } else {
    submitSurvey();
  }
}

// --- 다음 질문 ---
function nextQuestion() {
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
    imageID: getImageID(selectedImages[currentImage]),
    score: value
  });

  currentImage++;
  loadImage();
}

function prevQuestion() {
  if (currentImage > 0) {
    currentImage--;
    responses.pop();
    loadImage();
  }
}

// --- 제출 ---
function submitSurvey() {
  fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ participant, userID, responses })
  })
  .then(() => showPage("end-page"))
  .catch(err => alert("제출 중 오류: " + err.message));
}
