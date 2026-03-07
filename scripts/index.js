const clickButton = document.getElementById("button");
const optionElms = document.querySelectorAll(".levels div div");
const easyElm = document.querySelector(".easy");
const mediumElm = document.querySelector(".medium");
const hardElm = document.querySelector(".hard");
const navElm = document.querySelector("nav");
const sunElm = document.getElementById("sun");
const moonElm = document.getElementById("moon");
const houseElm = document.querySelector(".fa-house");

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
  window.location.href = `game.html?boardWidth=${boardWidth}&boardHeight=${boardHeight}&viewTime=${viewTime}`;
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
    if (sunElm.classList.contains("none")) {
      easyElm.classList.remove("chosen");
      mediumElm.classList.remove("chosen");
      hardElm.classList.remove("chosen");
      easyElm.classList.remove("chosen2");
      mediumElm.classList.remove("chosen2");
      hardElm.classList.remove("chosen2");
      div.classList.remove("chosen2");
      div.classList.add("chosen");
    } else {
      easyElm.classList.remove("chosen2");
      mediumElm.classList.remove("chosen2");
      hardElm.classList.remove("chosen2");
      easyElm.classList.remove("chosen");
      mediumElm.classList.remove("chosen");
      hardElm.classList.remove("chosen");
      div.classList.remove("chosen");
      div.classList.add("chosen2");
    }
  });
});
