const imagePaths = [
  "assets/images/ball.jpg",
  "assets/images/car.jpg",
  "assets/images/dice.jpg",
  "assets/images/donut.jpg",
  "assets/images/frog.jpg",
  "assets/images/pinkheart.jpg",
  "assets/images/pizza.jpg",
  "assets/images/planet.jpg",
  "assets/images/pony.jpg",
  "assets/images/poop.jpg",
  "assets/images/ring.jpg",
  "assets/images/star.jpg",
];

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function checkWin() {
  const flippedCards = document.querySelectorAll(".card.flipped");
  return flippedCards.length === cards.length;
}

const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);

const boardWidth = parseInt(urlParams.get("boardWidth")) || 4; // Default to 4 if not provided
const boardHeight = parseInt(urlParams.get("boardHeight")) || 4; // Default to 4 if not provided
const viewTime = parseInt(urlParams.get("viewTime")) * 1000 || 1000; // Convert to milliseconds

const gameBoard = document.getElementById("memory-container");
gameBoard.style.gridTemplateColumns = `repeat(${boardWidth}, 1fr)`;
gameBoard.style.gridTemplateRows = `repeat(${boardHeight}, 1fr)`;

let attempts = 0;
let recordAttempts = localStorage.getItem("recordAttempts") || Infinity;

// Generates pairs of cards based on the board size and shuffles them
let cards = [];
for (let i = 0; i < (boardWidth * boardHeight) / 2; i++) {
  cards.push(i);
  cards.push(i);
}

shuffle(cards);

let firstCard = null;
let frozen = false;

// Create card elements and add click event listeners
for (let i = 0; i < cards.length; i++) {
  const card = document.createElement("div");
  card.classList.add("card");
  card.dataset.value = cards[i];
  card.innerHTML = `<img src="${imagePaths[cards[i]]}" alt="Card Image">`;

  card.addEventListener("click", () => {
    // Prevent clicking on already flipped cards or the same card
    if (card.classList.contains("flipped") || firstCard === card || frozen)
      return;
    card.classList.add("flipped");

    // If it's the first card, store it. Otherwise, check for a match.
    if (!firstCard) {
      firstCard = card;
    } else {
      attempts++;

      // Check if the two flipped cards match
      if (firstCard.dataset.value === card.dataset.value) {
        firstCard = null;

        // Check if all cards are flipped to determine if the player has won
        if (checkWin()) {
          setTimeout(() => {
            alert(`Congratulations! You've won in ${attempts} attempts!`);
            if (attempts < recordAttempts) {
              localStorage.setItem("recordAttempts", attempts);
            }
          }, 500);
        }
      } else {
        frozen = true;
        setTimeout(() => {
          firstCard.classList.remove("flipped");
          card.classList.remove("flipped");
          firstCard = null;
          frozen = false;
        }, viewTime);
      }
    }
  });

  gameBoard.appendChild(card);
}
