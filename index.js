



const clickButton = document.getElementById("button")

clickButton.addEventListener("click", klikk)

function klikk() {
    const clickElm = document.querySelector(".click")
    clickElm.style.display = "block"
}