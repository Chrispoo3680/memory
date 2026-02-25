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

const boardWidth = parseInt(urlParams.get("boardWidth"));
const boardHeight = parseInt(urlParams.get("boardHeight"));
const viewTime = parseInt(urlParams.get("viewTime")) * 1000; // Convert to milliseconds

const gameBoard = document.getElementById("game-board");
gameBoard.style.gridTemplateColumns = `repeat(${boardWidth}, 1fr)`;

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

// Create card elements and add click event listeners
for (let i = 0; i < cards.length; i++) {
  const card = document.createElement("div");
  card.classList.add("card");
  card.dataset.value = cards[i];
  card.innerHTML = `<img src="images/${cards[i]}.png" alt="Card Image">`;

  card.addEventListener("click", () => {
    // Prevent clicking on already flipped cards or the same card
    if (card.classList.contains("flipped") || firstCard === card) return;
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
        setTimeout(() => {
          firstCard.classList.remove("flipped");
          card.classList.remove("flipped");
          firstCard = null;
        }, viewTime);
      }
    }
  });

  gameBoard.appendChild(card);
}
