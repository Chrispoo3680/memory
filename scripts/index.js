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

const moonBtn = document.getElementById("moon")
const sunBtn = document.getElementById("sun")

moonBtn.addEventListener("click",
  function changemoon() {
    document.body.classList.toggle("moon")
  }
)

sunBtn.addEventListener("click",
  function changesun() {
    document.body.classList.toggle("sun")
  }
)


