const clickButton = document.getElementById("button");
const optionElms = document.querySelectorAll(".levels div div");
const easyElm = document.querySelector(".easy");
const mediumElm = document.querySelector(".medium");
const hardElm = document.querySelector(".hard");
const navElm = document.querySelector("nav");
const sunElm = document.getElementById("sun");
const moonElm = document.getElementById("moon");
const houseElm = document.querySelector(".fa-house");

// ── Enspiller / Flerspiller selection ──
const selectionBtns = document.querySelectorAll(".selection-btn");
const singlePlayerMenu = document.getElementById("single-player-menu");
const multiPlayerMenu = document.getElementById("lobby");

selectionBtns[0].addEventListener("click", () => {
  selectionBtns[0].classList.add("selected");
  selectionBtns[1].classList.remove("selected");
  singlePlayerMenu.classList.remove("hidden");
  multiPlayerMenu.classList.add("hidden");
});

selectionBtns[1].addEventListener("click", () => {
  selectionBtns[1].classList.add("selected");
  selectionBtns[0].classList.remove("selected");
  multiPlayerMenu.classList.remove("hidden");
  singlePlayerMenu.classList.add("hidden");
});

clickButton.addEventListener("click", klikk);
document.querySelector("#start-button").classList.add("none");
function klikk() {
  const clickElm = document.querySelector(".click");
  if (clickElm.style.display === "flex") {
    clickElm.style.display = "none";
    document.getElementById("start-button").classList.add("none");
    clickButton.classList.replace("fa-xmark", "fa-bars");
  } else {
    clickElm.style.display = "flex";
    document.getElementById("start-button").classList.remove("none");
    clickButton.classList.replace("fa-bars", "fa-xmark");
  }
}

function setDifficulty(level) {
  switch (level) {
    case "easy":
      boardWidth = 4;
      boardHeight = 3;
      viewTime = 1;
      break;
    case "medium":
      boardWidth = 8;
      boardHeight = 6;
      viewTime = 0.75;
      break;
    case "hard":
      boardWidth = 12;
      boardHeight = 8;
      viewTime = 0.5;
      break;
    default:
      boardWidth = 4;
      boardHeight = 4;
      viewTime = 1;
  }
}

let boardWidth = 6;
let boardHeight = 3;
let viewTime = 1;

const startButton = document.getElementById("start-button");
startButton.addEventListener("click", () => {
  document.getElementById("sp-attempts").textContent = "0";
  document.getElementById("single-player-game").classList.remove("hidden");
  initGame(boardWidth, boardHeight, viewTime * 1000);
});

// ── Back to menu from game screen ──
document.getElementById("sp-back-btn").addEventListener("click", () => {
  document.getElementById("single-player-game").classList.add("hidden");
  document.getElementById("sp-memory-container").innerHTML = "";
});

sunElm.classList.add("none");
navElm.onclick = function () {
  sunElm.classList.toggle("none");
  moonElm.classList.toggle("none");
  if (moonElm.classList.contains("none")) {
    document.querySelector(".indexheader").style.backgroundColor = "#16002d";
    document.querySelector(".headerbottom").style.filter = "invert(1)";
    document.querySelector("section").style.backgroundImage =
      "url(assets/images/gamecatalog2.png)";
    document.querySelector("section img").src =
      "assets/images/VelkommenBigPurple.png";
  } else {
    document.querySelector(".indexheader").style.backgroundColor = "white";
    document.querySelector(".headerbottom").style.filter = "invert(0)";
    document.querySelector("section").style.backgroundImage =
      "url(assets/images/gamecatalog.png)";
    document.querySelector("section img").src =
      "assets/images/VelkommenBig.png";
  }
};
optionElms.forEach(function (div) {
  div.addEventListener("click", function () {
    const isDark = sunElm.classList.contains("none");
    [easyElm, mediumElm, hardElm].forEach((el) =>
      el.classList.remove("chosen", "chosen2"),
    );
    div.classList.add(isDark ? "chosen" : "chosen2");
  });
});
