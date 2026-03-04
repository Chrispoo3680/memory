const clickButton = document.getElementById("button");

clickButton.addEventListener("click", klikk);

function klikk() {
  const clickElm = document.querySelector(".click");
  if (clickElm.style.display === "flex") {
    clickElm.style.display = "none";
  } else {
    clickElm.style.display = "flex";
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

let boardWidth = 4;
let boardHeight = 4;
let viewTime = 1;

const startButton = document.getElementById("start-button");
startButton.addEventListener("click", () => {
  window.location.href = `game.html?boardWidth=${boardWidth}&boardHeight=${boardHeight}&viewTime=${viewTime}`;
});

/* const moonBtn = document.getElementById("moon");
const sunBtn = document.getElementById("sun");

moonBtn.addEventListener("click", function changemoon() {
  document.body.classList.toggle("moon");
  document.body.classList.remove("sun");
});

sunBtn.addEventListener("click", function changesun() {
  document.body.classList.toggle("sun");
  document.body.classList.remove("moon");
});
 */
navElm = document.querySelector("nav");
sunElm = document.getElementById("sun");
moonElm = document.getElementById("moon");
houseElm = document.querySelector(".fa-house");
sunElm.classList.add("none");
navElm.onclick = function () {
  sunElm.classList.toggle("none");
  moonElm.classList.toggle("none");
  if (moonElm.classList.contains("none")) {
    sunElm.style.color = "#968f8f";
    moonElm.style.color = "#968f8f";
    houseElm.style.color = "#968f8f";
    document.body.style.backgroundColor = "#282828";
  } else {
    sunElm.style.color = "#e2a4ec";
    moonElm.style.color = "#e2a4ec";
    houseElm.style.color = "#e2a4ec";
    document.body.style.backgroundColor = "#482148";
  }
};
