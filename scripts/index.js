const clickButton = document.getElementById("button");

clickButton.addEventListener("click", klikk);

function klikk() {
  const clickElm = document.querySelector(".click");
  if (clickElm.style.display === "block") {
    clickElm.style.display = "none";
  } else {
    clickElm.style.display = "block";
  }
}
