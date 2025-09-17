let currentPage = 0;
const pages = document.querySelectorAll('.page');
const images = Array.from({length: 23}, (_, i) => `images/${i+1}.jpg`); // 랜덤샘플링용 placeholder
let currentImageIndex = 0;
let responses = [];

function showPage(index) {
  pages.forEach((p,i)=>p.classList.toggle('active', i===index));
  currentPage = index;
}

function nextPage() { showPage(currentPage+1); }
function prevPage() { if(currentPage>0) showPage(currentPage-1); }

function validateInfo() {
  const gender = document.querySelector('input[name="gender"]:checked');
  const age = document.getElementById('age').value;
  if(!gender || !age) { alert("성별과 연령대를 모두 선택하세요."); return; }
  nextPage();
  loadImage();
}

function loadImage() {
  if(currentImageIndex>=images.length) { submitSurvey(); return; }
  document.getElementById('image-container').innerHTML = `<img src="${images[currentImageIndex]}" width="400">`;
  let options = '';
  for(let i=0;i<=10;i++){
    options+=`<button onclick="selectScore(${i})">${i}</button>`;
  }
  document.getElementById('options').innerHTML = options;
  updateProgress();
}

function selectScore(score) {
  responses.push({image: images[currentImageIndex], score});
  currentImageIndex++;
  loadImage();
}

function updateProgress() {
  const percent = (currentImageIndex/images.length)*100;
  document.getElementById('progress').style.width = percent+"%";
}

function submitSurvey() {
  fetch("https://script.google.com/macros/s/AKfycbz9TmijBEyrgM0vS4nh5E3HimRTxrZfx8Zq3vL_iPx3lUED3cJn-lBxEOI76Gz3VCW_/exec", {
    method: "POST",
    body: JSON.stringify(responses)
  }).then(()=>{
    nextPage();
  }).catch(()=>{
    alert("제출 중 오류 발생");
  });
}

showPage(0);
