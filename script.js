const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyNlFQT_gabFFEBIRD6oOAXHSPOweAR5tlM67fBIh7tx1BDnCBBzCIqzIurM4b6j06I/exec";

let userID = generateUserID();
let participant = { gender: null, age: null };
let responses = [];
let allImages = [];
let currentIndex = 0;
const SAMPLE_SIZE = 23;

// UUID 생성
function generateUserID() {
  return 'xxxx-xxxx-xxxx-xxxx'.replace(/[x]/g, () =>
    Math.floor(Math.random() * 16).toString(16)
  );
}

// JSONP 요청
function jsonpRequest(data) {
  return new Promise((resolve, reject) => {
    const callbackName = "cb_" + Date.now();
    window[callbackName] = (res) => {
      delete window[callbackName];
      document.body.removeChild(script);
      resolve(res);
    };
    const script = document.createElement("script");
    script.src = `${APPS_SCRIPT_URL}?callback=${callbackName}&data=${encodeURIComponent(JSON.stringify(data))}`;
    script.onerror = () => {
      delete window[callbackName];
      reject("JSONP 요청 실패");
    };
    document.body.appendChild(script);
  });
}

// GitHub 이미지 로드
async function loadImages() {
  const url = "https://api.github.com/repos/littledoor-ai/survey-project/git/trees/main?recursive=1";
  const res = await fetch(url);
  const data = await res.json();
  allImages = data.tree
    .filter(f => f.path.startsWith("images") && f.path.match(/\.(jpg|jpeg|png|gif)$/i))
    .map(f => `https://raw.githubusercontent.com/littledoor-ai/survey-project/main/${f.path}`);
  allImages = allImages.sort(() => 0.5 - Math.random()).slice(0, SAMPLE_SIZE);
}

// 질문 표시
function showQuestion() {
  if (currentIndex >= allImages.length) {
    showPage("end-page");
    return;
  }
  document.getElementById("survey-image").src = allImages[currentIndex];
  document.getElementById("progress").innerText = `${currentIndex + 1} / ${allImages.length}`;
  document.querySelectorAll('input[name="score"]').forEach(r => r.checked = false);
}

// 다음 버튼
document.getElementById("nextBtn").addEventListener("click", async () => {
  const radios = document.querySelectorAll('input[name="score"]');
  let value = null;
  radios.forEach(r => { if (r.checked) value = r.value; });
  if (value === null) {
    alert("⚠️ 점수를 선택해주세요!");
    return;
  }

  const answer = {
    timestamp: new Date().toISOString(),
    userID,
    gender: participant.gender,
    age: participant.age,
    imageID: allImages[currentIndex],
    score: parseInt(value)
  };

  responses.push(answer);

  try {
    const res = await jsonpRequest(answer);
    console.log("서버 응답:", res);
  } catch (err) {
    console.error(err);
  }

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
  showPage("survey-page");
  showQuestion();
});

// 페이지 전환
function showPage(id) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}
