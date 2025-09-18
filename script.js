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

// 페이지 전환
function showPage(pageId) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(pageId).classList.add("active");
}

// 이미지 목록 불러오기 (GitHub API)
async function getImageList() {
  try {
    const api = `https://api.github.com/repos/${GITHUB.owner}/${GITHUB.repo}/git/trees/${GITHUB.branch}?recursive=1`;
    console.log('GitHub API URL:', api);
    
    const res = await fetch(api);
    if (!res.ok) {
      throw new Error(`GitHub API 오류: ${res.status} ${res.statusText}`);
    }
    
    const data = await res.json();
    console.log('GitHub API 응답:', data);
    
    const exts = /\.(jpg|jpeg|png|webp)$/i;
    const imageFiles = data.tree
      .filter(item => item.type === "blob" && item.path.startsWith(`${GITHUB.path}/`) && exts.test(item.path))
      .map(item => `https://raw.githubusercontent.com/${GITHUB.owner}/${GITHUB.repo}/${GITHUB.branch}/${item.path}`);
    
    console.log('찾은 이미지 파일들:', imageFiles);
    return imageFiles;
  } catch (error) {
    console.error('이미지 목록 불러오기 오류:', error);
    throw error;
  }
}

// 설문 초기화
async function initSurvey() {
  const loadingEl = document.getElementById("loading");
  loadingEl.style.display = "block";
  loadingEl.textContent = "이미지 목록을 불러오는 중...";
  
  try {
    const allImages = await getImageList();
    if (allImages.length === 0) {
      throw new Error("images 폴더에서 이미지를 찾을 수 없습니다.");
    }
    
    // 샘플 크기를 실제 이미지 수에 맞춰 조정
    const actualSampleSize = Math.min(SAMPLE_SIZE, allImages.length);
    selectedImages = allImages.sort(() => 0.5 - Math.random()).slice(0, actualSampleSize);
    
    console.log(`총 ${allImages.length}개 이미지 중 ${selectedImages.length}개 선택됨`);
    
    currentImage = 0;
    responses = [];
    
    loadingEl.textContent = "이미지를 불러오는 중...";
    await loadImage();
    
  } catch (err) {
    console.error('설문 초기화 오류:', err);
    alert(`이미지를 불러오는 중 오류가 발생했습니다:\n${err.message}\n\n확인사항:\n1. GitHub 저장소 정보가 정확한지\n2. images 폴더에 이미지가 있는지\n3. 저장소가 public인지`);
  } finally {
    loadingEl.style.display = "none";
  }
}

// 이미지 로딩 (비동기 처리 개선)
async function loadImage() {
  return new Promise((resolve, reject) => {
    const img = document.getElementById("survey-image");
    const loadingEl = document.getElementById("loading");
    
    // 이전 이벤트 리스너 제거
    img.onload = null;
    img.onerror = null;
    
    loadingEl.style.display = "block";
    loadingEl.textContent = "이미지를 불러오는 중...";
    
    img.onload = () => {
      loadingEl.style.display = "none";
      updateProgress();
      clearScoreSelection();
      resolve();
    };
    
    img.onerror = () => {
      console.error('이미지 로딩 실패:', selectedImages[currentImage]);
      loadingEl.style.display = "none";
      reject(new Error('이미지를 불러올 수 없습니다.'));
    };
    
    img.src = selectedImages[currentImage];
  });
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

  // 응답 저장 (이 부분이 앞으로 이동)
  responses.push({
    timestamp: new Date().toISOString(),
    userID,
    gender: participant.gender,
    age: participant.age,
    imageID: getImageID(selectedImages[currentImage]),
    imageUrl: selectedImages[currentImage],
    score: parseInt(value)
  });

  console.log(`응답 ${responses.length}개 저장됨`, responses[responses.length - 1]);

  // 마지막 이미지인지 확인
  if (currentImage >= selectedImages.length - 1) {
    console.log('마지막 이미지 - 제출 시작');
    await submitSurvey();
    return;
  }

  // 다음 이미지로
  currentImage++;
  try {
    await loadImage();
  } catch (error) {
    console.error('다음 이미지 로딩 오류:', error);
    alert('다음 이미지를 불러오는데 실패했습니다. 다시 시도해주세요.');
  }
}

// 이전 질문
async function prevQuestion() {
  if (currentImage > 0) {
    currentImage--;
    responses.pop(); // 마지막 응답 제거
    console.log(`이전 질문으로 이동, 현재 응답 수: ${responses.length}`);
    
    try {
      await loadImage();
    } catch (error) {
      console.error('이전 이미지 로딩 오류:', error);
      alert('이전 이미지를 불러오는데 실패했습니다.');
    }
  }
}

// 제출 함수 개선
async function submitSurvey() {
  const loadingEl = document.getElementById("loading");
  loadingEl.style.display = "block";
  loadingEl.textContent = "응답을 제출하는 중...";
  
  // 제출 버튼 비활성화
  const nextBtn = document.getElementById("nextBtn");
  nextBtn.disabled = true;
  nextBtn.textContent = "제출 중...";
  
  try {
    console.log('제출할 데이터:', { participant, userID, responses });
    
    // Google Apps Script URL이 설정되어 있는지 확인
    if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL.includes('YOUR_')) {
      throw new Error('Google Apps Script URL이 설정되지 않았습니다.');
    }
    
    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ 
        participant, 
        userID, 
        responses,
        totalResponses: responses.length,
        timestamp: new Date().toISOString()
      }),
      // CORS 문제 해결을 위한 모드 설정
      mode: 'cors'
    });

    console.log('제출 응답 상태:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('제출 오류 응답:', errorText);
      throw new Error(`제출 실패: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.text();
    console.log('제출 성공:', result);
    
    showPage("end-page");
    
  } catch (error) {
    console.error('제출 오류:', error);
    
    // 사용자에게 친화적인 오류 메시지
    let errorMessage = '응답 제출 중 오류가 발생했습니다.\n\n';
    
    if (error.message.includes('CORS') || error.message.includes('blocked')) {
      errorMessage += 'CORS 오류: Google Apps Script 설정을 확인해주세요.';
    } else if (error.message.includes('Google Apps Script')) {
      errorMessage += 'Google Apps Script URL을 확인해주세요.';
    } else {
      errorMessage += `오류 내용: ${error.message}`;
    }
    
    errorMessage += '\n\n잠시 후 다시 시도하거나 관리자에게 문의해주세요.';
    
    alert(errorMessage);
    
    // 제출 버튼 복원
    nextBtn.disabled = false;
    nextBtn.textContent = "다시 제출";
    
  } finally {
    loadingEl.style.display = "none";
  }
}

// 이벤트 바인딩
document.addEventListener("DOMContentLoaded", () => {
  console.log('DOM 로드 완료');
  
  document.getElementById("startBtn").addEventListener("click", () => {
    const gender = document.querySelector('input[name="gender"]:checked');
    const age = document.getElementById("age").value;
    
    if (!gender || !age) {
      alert("⚠️ 성별과 연령대를 선택해주세요.");
      return;
    }
    
    participant.gender = gender.value;
    participant.age = age;
    
    console.log('설문 시작:', participant);
    
    showPage("survey-page");
    initSurvey();
  });
  
  document.getElementById("nextBtn").addEventListener("click", nextQuestion);
  document.getElementById("prevBtn").addEventListener("click", prevQuestion);
  
  // 키보드 단축키 (선택사항)
  document.addEventListener("keydown", (e) => {
    if (document.getElementById("survey-page").classList.contains("active")) {
      if (e.key >= "0" && e.key <= "9") {
        const radio = document.querySelector(`input[name="score"][value="${e.key}"]`);
        if (radio) radio.checked = true;
      } else if (e.key === "Enter") {
        e.preventDefault();
        nextQuestion();
      }
    }
  });
});