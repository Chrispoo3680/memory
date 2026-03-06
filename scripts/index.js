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
let boardHeight = 3;
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
