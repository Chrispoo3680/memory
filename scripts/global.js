navElm = document.querySelector("nav");
sunElm = document.getElementById("sun");
moonElm = document.getElementById("moon");
houseElm = document.querySelector(".fa-house");
sunElm.classList.add("none");
navElm.onclick = function () {
  sunElm.classList.toggle("none");
  moonElm.classList.toggle("none");
  if (moonElm.classList.contains("none")) {
    document.querySelector("section:first-of-type").style.filter =
      "saturate(2)";
    document.querySelector(".indexheader").style.backgroundColor = "#16002d";
    document.querySelector(".headerbottom").style.filter = "invert(1)";
    moonElm.style.filter = "invert(1)";
    sunElm.style.filter = "invert(1)";
    houseElm.style.filter = "invert(1)";
    document.querySelector("section:nth-of-type(2)").style.backgroundColor =
      "#16002d";
    document.querySelector("p").style.color = "white";
  } else {
    document.querySelector("section:first-of-type").style.filter = "none";
    document.querySelector(".indexheader").style.backgroundColor = "white";
    document.querySelector(".headerbottom").style.filter = "invert(0)";
    moonElm.style.filter = "invert(0)";
    sunElm.style.filter = "invert(0)";
    houseElm.style.filter = "invert(0)";
    document.querySelector("section:nth-of-type(2)").style.backgroundColor =
      "white";
    document.querySelector("p").style.color = "black";
  }
};
