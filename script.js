const scriptURL = "https://script.google.com/macros/s/AKfycbz9TmijBEyrgM0vS4nh5E3HimRTxrZfx8Zq3vL_iPx3lUED3cJn-lBxEOI76Gz3VCW_/exec";

let allImages = [];
for (let i = 1; i <= 740; i++) {
  let fileName = i.toString().padStart(3, '0');
  allImages.push(`${fileName}.png`);
}

let selectedImages = [];
let currentIndex = 0;
let responses = [];

document.getElementById("startBtn").addEventListener("click", () => {
  // 23장 무작위 샘플링
  selectedImages = allImages.sort(() => 0.5 - Math.random()).slice(0, 23);
  document.getElementById("intro").style.display = "none";
  document.getElementById("survey").style.display = "block";
  showImage();
});

function showImage() {
  let imgElem = document.getElementById("image");
  let fileName = selectedImages[currentIndex];
  imgElem.src = `images/${fileName}`;

  document.getElementById("progress").innerText =
    `진행 상황: ${currentIndex + 1} / ${selectedImages.length}`;

  let scaleDiv = document.getElementById("scale");
  scaleDiv.innerHTML = "";
  for (let i = 0; i <= 10; i++) {
    let btn = document.createElement("button");
    btn.innerText = i;
    btn.onclick = () => {
      responses[currentIndex] = { image: fileName, score: i };
      document.getElementById("nextBtn").disabled = false;
    };
    scaleDiv.appendChild(btn);
  }
}

document.getElementById("nextBtn").addEventListener("click", () => {
  document.getElementById("nextBtn").disabled = true;
  currentIndex++;
  if (currentIndex < selectedImages.length) {
    showImage();
  } else {
    submitResponses();
  }
});

function submitResponses() {
  responses.forEach(r => {
    fetch(scriptURL, {
      method: "POST",
      body: new URLSearchParams(r)
    });
  });
  document.getElementById("survey").style.display = "none";
  document.getElementById("end").style.display = "block";
}
