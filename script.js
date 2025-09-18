/***** ✅ 사용자가 직접 수정해야 하는 부분 *****/
// 깃허브 저장소 정보 입력
const GITHUB = {
  owner: "littledoor-ai",      // ✅ 본인 깃허브 ID
  repo: "survey-project",       // ✅ 저장소 이름
  branch: "main",               // ✅ 브랜치 (보통 main)
  path: "images"                // ✅ 이미지 폴더 이름
};

// Google Apps Script Web App URL 입력
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwlgMdrzXJK1nwU2l57O1TVt9JetbmwURbss7wdOVeAZbj-y_1fdG0df_EaQgMcEOG0/exec";

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

// 이미지 목록 불러오기 (GitHub API) - 오류 처리 개선
async function getImageList() {
  try {
    const api = `https://api.github.com/repos/${GITHUB.owner}/${GITHUB.repo}/git/trees/${GITHUB.branch}?recursive=1`;
    console.log('GitHub API 호출:', api);
    
    const res = await fetch(api);
    if (!res.ok) {
      throw new Error(`GitHub API 오류: ${res.status} ${res.statusText}`);
    }
    
    const data = await res.json();
    console.log('GitHub API 응답:', data);
    
    const exts = /\.(jpg|jpeg|png|webp)$/i;
    const images = data.tree
      .filter(item => item.type === "blob" && item.path.startsWith(`${GITHUB.path}/`) && exts.test(item.path))
      .map(item => `https://raw.githubusercontent.com/${GITHUB.owner}/${GITHUB.repo}/${GITHUB.branch}/${item.path}`);
    
    console.log(`찾은 이미지: ${images.length}개`);
    return images;
    
  } catch (error) {
    console.error('이미지 목록 불러오기 실패:', error);
    throw error;
  }
}

// 설문 초기화 - 오류 처리 강화
async function initSurvey() {
  const loadingEl = document.getElementById("loading");
  loadingEl.style.display = "block";
  loadingEl.textContent = "이미지 목록을 불러오는 중...";
  
  try {
    const allImages = await getImageList();
    if (allImages.length === 0) {
      throw new Error("images 폴더에 이미지가 없습니다.");
    }
    
    // 실제 사용할 이미지 수 결정
    const actualSampleSize = Math.min(SAMPLE_SIZE, allImages.length);
    selectedImages = allImages.sort(() => 0.5 - Math.random()).slice(0, actualSampleSize);
    
    console.log(`총 ${allImages.length}개 중 ${selectedImages.length}개 선택`);
    
    currentImage = 0;
    responses = [];
    
    // 첫 이미지 로딩
    await loadImage();
    
  } catch (err) {
    console.error('설문 초기화 오류:', err);
    alert(`이미지를 불러오는 중 오류가 발생했습니다:\n${err.message}\n\n확인사항:\n1. GitHub 저장소 정보가 정확한지\n2. images 폴더에 이미지 파일이 있는지\n3. 인터넷 연결 상태`);
  } finally {
    loadingEl.style.display = "none";
  }
}

// 이미지 로딩 - Promise 기반으로 개선
function loadImage() {
  return new Promise((resolve, reject) => {
    const img = document.getElementById("survey-image");
    const loadingEl = document.getElementById("loading");
    
    loadingEl.style.display = "block";
    loadingEl.textContent = "이미지를 불러오는 중...";
    
    // 이미지 로드 완료 처리
    img.onload = () => {
      loadingEl.style.display = "none";
      updateProgress();
      clearScoreSelection();
      console.log(`이미지 ${currentImage + 1} 로딩 완료`);
      resolve();
    };
    
    // 이미지 로드 실패 처리
    img.onerror = () => {
      loadingEl.style.display = "none";
      const errorMsg = `이미지를 불러올 수 없습니다: ${getImageID(selectedImages[currentImage])}`;
      console.error(errorMsg);
      reject(new Error(errorMsg));
    };
    
    // 이미지 소스 설정
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

// 다음 질문 - 오류 처리 개선
async function nextQuestion() {
  const radios = document.querySelectorAll('input[name="score"]');
  let value = null;
  radios.forEach(r => { if (r.checked) value = r.value; });
  
  if (value === null) {
    alert("⚠️ 점수를 선택해주세요!");
    return;
  }

  // 응답 저장
  responses.push({
    timestamp: new Date().toISOString(),
    userID,
    gender: participant.gender,
    age: participant.age,
    imageID: getImageID(selectedImages[currentImage]),
    imageUrl: selectedImages[currentImage],
    score: parseInt(value)
  });

  console.log(`응답 저장됨 (${responses.length}/${selectedImages.length}):`, responses[responses.length - 1]);

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
    alert(`다음 이미지를 불러오는데 실패했습니다:\n${error.message}`);
  }
}

// 이전 질문
async function prevQuestion() {
  if (currentImage > 0) {
    currentImage--;
    responses.pop(); // 마지막 응답 제거
    console.log(`이전 이미지로 이동, 현재 응답 수: ${responses.length}`);
    
    try {
      await loadImage();
    } catch (error) {
      alert(`이전 이미지를 불러오는데 실패했습니다:\n${error.message}`);
    }
  }
}

// 제출 함수 - 대폭 개선
async function submitSurvey() {
  const loadingEl = document.getElementById("loading");
  const nextBtn = document.getElementById("nextBtn");
  
  loadingEl.style.display = "block";
  loadingEl.textContent = "응답을 제출하는 중...";
  
  // 제출 버튼 비활성화
  nextBtn.disabled = true;
  nextBtn.textContent = "제출 중...";
  
  try {
    console.log('제출 시작:', {
      userID,
      participant,
      responseCount: responses.length
    });
    
    // 제출 데이터 준비
    const submitData = {
      participant,
      userID,
      responses,
      timestamp: new Date().toISOString(),
      totalResponses: responses.length
    };
    
    console.log('제출 데이터:', submitData);
    
    // Google Apps Script로 제출
    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json"
      },
      body: JSON.stringify(submitData)
    });
    
    console.log('서버 응답 상태:', response.status, response.statusText);
    
    // 응답 처리
    let result;
    const responseText = await response.text();
    console.log('서버 응답 내용:', responseText);
    
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.warn('JSON 파싱 실패:', parseError);
      // JSON이 아닌 경우 텍스트 그대로 처리
      if (response.ok) {
        result = { status: "success", message: "제출 완료" };
      } else {
        throw new Error(`서버 오류 (${response.status}): ${responseText}`);
      }
    }
    
    console.log('파싱된 결과:', result);
    
    // 결과 확인
    if (result.status === "error") {
      throw new Error(result.message || "서버에서 오류가 발생했습니다.");
    }
    
    // 성공 처리
    console.log('제출 성공!');
    showPage("end-page");
    
  } catch (error) {
    console.error('제출 오류:', error);
    
    let errorMessage = '응답 제출 중 오류가 발생했습니다.\n\n';
    
    if (error.message.includes('Failed to fetch')) {
      errorMessage += '네트워크 연결을 확인하고 다시 시도해주세요.';
    } else if (error.message.includes('CORS')) {
      errorMessage += 'Google Apps Script 설정을 확인해주세요.';
    } else {
      errorMessage += `오류 내용: ${error.message}`;
    }
    
    errorMessage += '\n\n"다시 제출" 버튼으로 재시도하거나 새로고침 후 다시 시작해주세요.';
    
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
  console.log('페이지 로드 완료');
  console.log('사용자 ID:', userID);
  console.log('Apps Script URL:', APPS_SCRIPT_URL);
  
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
  
  // 키보드 단축키 추가
  document.addEventListener("keydown", (e) => {
    if (document.getElementById("survey-page").classList.contains("active")) {
      if (e.key >= "0" && e.key <= "9") {
        const radio = document.querySelector(`input[name="score"][value="${e.key}"]`);
        if (radio) {
          radio.checked = true;
        }
      } else if (e.key === "Enter") {
        e.preventDefault();
        nextQuestion();
      }
    }
  });
});