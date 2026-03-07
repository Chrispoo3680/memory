mainElm = document.querySelector("main");
navElm = document.querySelector("nav");
sunElm = document.getElementById("sun");
moonElm = document.getElementById("moon");
arrowElm = document.querySelector(".fa-arrow-left");
memoryIMG = document.querySelector("section > img");
sunElm.classList.add("none");
navElm.onclick = function () {
  sunElm.classList.toggle("none");
  moonElm.classList.toggle("none");
  if (moonElm.classList.contains("none")) {
    mainElm.style.backgroundColor = "#000000d7";
    sunElm.style.color = "#968f8f";
    moonElm.style.color = "#968f8f";
    arrowElm.style.color = "#968f8f";
    memoryIMG.src = "assets/images/bildepurple.png";
    document.querySelector("#memory-container").style.border =
      "1px solid white";
    document.querySelectorAll(".card").forEach(function (div) {
      div.style.backgroundImage = "url(assets/images/questionpurple.png)";
    });
  } else {
    mainElm.style.backgroundColor = "#421242d7";
    sunElm.style.color = "#e2a4ec";
    moonElm.style.color = "#e2a4ec";
    arrowElm.style.color = "#e2a4ec";
    memoryIMG.src = "assets/images/bilde.png";
    document.querySelector("#memory-container").style.border = "none";
    document.querySelectorAll(".card").forEach(function (div) {
      div.style.backgroundImage = "url(assets/images/question.png)";
    });
  }
};
