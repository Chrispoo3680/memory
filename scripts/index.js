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
