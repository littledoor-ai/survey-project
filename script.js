/***** ✅ 사용자가 직접 수정해야 하는 부분 *****/
// 깃허브 저장소 정보 입력
const GITHUB = {
  owner: "littledoor-ai",      // ✅ 본인 깃허브 ID
  repo: "survey-project",       // ✅ 저장소 이름
  branch: "main",               // ✅ 브랜치 (보통 main)
  path: "images"                // ✅ 이미지 폴더 이름
};

// Google Apps Script Web App URL 입력
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby1N-WkRs5yUVFOuZZSv4_3Oq0DAGdmDIS1o77wlXUP971Pho2ym77f6Sos_9ZarBxX/exec"; // ✅ 여기 붙여넣기

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
  if (!res.ok) throw new Error("이미지 목록을 불러오지 못했습니다.");
  const data = await res.json();
  const exts = /\.(jpg|jpeg|png|webp)$/i;
  return data.tree
    .filter(item => item.type === "blob" && item.path.startsWith(`${GITHUB.path}/`) && exts.test(item.path))
    .map(item => `https://raw.githubusercontent.com/${GITHUB.owner}/${GITHUB.repo}/${GITHUB.branch}/${item.path}`);
}

// 설문 초기화
async function initSurvey() {
  document.getElementById("loading").style.display = "block";
  try {
    const allImages = await getImageList();
    if (allImages.length === 0) throw new Error("이미지가 없습니다.");
    selectedImages = allImages.sort(() => 0.5 - Math.random()).slice(0, SAMPLE_SIZE);
    currentImage = 0;
    responses = [];
    loadImage();
  } catch (err) {
    alert("이미지를 불러오는 중 오류 발생: " + err.message);
  } finally {
    document.getElementById("loading").style.display = "none";
  }
}

// 이미지 로딩
function loadImage() {
  document.getElementById("survey-image").src = selectedImages[currentImage];
  document.getElementById("progress").innerText =
    `${currentImage + 1} / ${selectedImages.length}`;
  document.querySelectorAll('input[name="score"]').forEach(r => r.checked = false);
}

// 다음 질문
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
    gender: participant.gender,
    age: participant.age,
    imageID: getImageID(selectedImages[currentImage]),
    score: value
  });

  if (currentImage === selectedImages.length - 1) {
    submitSurvey(); // 마지막이면 제출
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

// 제출
async function submitSurvey() {
  const loadingEl = document.getElementById("loading");
  loadingEl.style.display = "block";
  loadingEl.textContent = "응답을 제출하는 중...";

  const nextBtn = document.getElementById("nextBtn");
  nextBtn.disabled = true;
  nextBtn.textContent = "제출 중...";

  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participant, userID, responses }),
      mode: "cors"
    });

    let result;
    try {
      result = await response.json();
    } catch {
      const text = await response.text();
      console.warn("JSON 파싱 실패, 응답 텍스트:", text);
      result = { status: "raw", message: text };
    }

    if (result.status === "error") {
      throw new Error(result.message);
    }

    showPage("end-page");

  } catch (error) {
    alert("응답 제출 중 오류 발생: " + error.message);
    nextBtn.disabled = false;
    nextBtn.textContent = "다시 제출";
  } finally {
    loadingEl.style.display = "none";
  }
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
