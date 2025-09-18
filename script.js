const GITHUB = {
  owner: "littledoor-ai",
  repo: "survey-project",
  branch: "main",
  path: "images"
};

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzqJZ3wigSlnzpD24c5Dywn48IGjs9KP-BSkz-lUuhcorYj63_PZTJZUADk0QAazSF3/exec";

const SAMPLE_SIZE = 23;
let userID = generateUserID();
let participant = { gender: null, age: null };
let responses = [];
let allImages = [];
let currentIndex = 0;

// 사용자 ID 생성
function generateUserID() {
  return 'xxxx-xxxx-xxxx-xxxx'.replace(/[x]/g, () =>
    Math.floor(Math.random() * 16).toString(16)
  );
}

// 페이지 표시
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(pageId).classList.add('active');
}

// 설문 시작
document.getElementById("startBtn").addEventListener("click", async () => {
  const gender = document.querySelector('input[name="gender"]:checked');
  const age = document.getElementById("age").value;

  if (!gender || !age) {
    alert("⚠️ 성별과 연령대를 선택해주세요.");
    return;
  }

  participant.gender = gender.value;
  participant.age = age;

  await loadImages();
  currentIndex = 0;
  responses = [];
  showQuestion();
  showPage("survey-page");
});

// GitHub에서 이미지 불러오기
async function loadImages() {
  const url = `https://api.github.com/repos/${GITHUB.owner}/${GITHUB.repo}/git/trees/${GITHUB.branch}?recursive=1`;
  const res = await fetch(url);
  const data = await res.json();

  allImages = data.tree
    .filter(f => f.path.startsWith(GITHUB.path) && f.path.match(/\.(jpg|jpeg|png|gif)$/i))
    .map(f => `https://raw.githubusercontent.com/${GITHUB.owner}/${GITHUB.repo}/${GITHUB.branch}/${f.path}`);

  allImages = allImages.sort(() => 0.5 - Math.random()).slice(0, SAMPLE_SIZE);
}

// 질문 표시
function showQuestion() {
  if (currentIndex >= allImages.length) {
    finishSurvey();
    return;
  }
  document.getElementById("survey-image").src = allImages[currentIndex];
  document.getElementById("progress").innerText = `${currentIndex + 1} / ${allImages.length}`;
  document.querySelectorAll('input[name="score"]').forEach(r => r.checked = false);
}

// 다음 버튼
document.getElementById("nextBtn").addEventListener("click", () => {
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
    imageID: allImages[currentIndex],
    score: parseInt(value)
  });

  currentIndex++;
  showQuestion();
});

// 이전 버튼
document.getElementById("prevBtn").addEventListener("click", () => {
  if (currentIndex > 0) {
    currentIndex--;
    responses.pop();
    showQuestion();
  }
});

// 설문 제출
async function finishSurvey() {
  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userID, participant, responses })
    });
    const result = await res.json();
    console.log("제출 성공:", result);
    showPage("end-page");
  } catch (err) {
    console.error("제출 오류:", err);
    alert("제출 중 오류 발생. 다시 시도해주세요.");
  }
}

console.log("사용자 ID:", userID);
console.log("Apps Script URL:", APPS_SCRIPT_URL);
