const INTERVAL_MS = 1000;
const SECOND_MS = 1000;
const MINUTE_MS = SECOND_MS * 60;
const BLACK = "#000000";
const WHITE = "#FFFFFF";
const YELLOW = "#FFD100";
const BLACK_BORDER = `1px solid ${BLACK}`;
const NO_BORDER = "0";
const ADD_COLOR_TEXT = "add color";

let timePassed = 0;
let votes = [];
let context = null;

const addColorButton = document.querySelector(".add-color");
const colorButtons = document.querySelectorAll(".color > input");
const colors = document.querySelector(".colors");
const form = document.querySelector("form");
const canvas = document.querySelector("canvas");

const resetAddColorButton = () => {
  addColorButton.style.backgroundColor = BLACK;
  addColorButton.style.color = WHITE;
  addColorButton.style.border = NO_BORDER;
  addColorButton.classList.add("inactive");
};

form.addEventListener(
  "submit",
  (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const color = data.get("color");
    fetch("/votes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ color }),
    })
      .then((response) => response.json())
      .then((data) => {
        console.log(data);
        if (!data.error) {
          resetAddColorButton();
          colors.classList.add("inactive");
          colorButtons.forEach((cb) => {
            cb.parentElement.classList.remove("checked", "unchecked");
            cb.checked = false;
          });
        }
        updateCounter();
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  },
  false
);

const fixedLengthTimePart = (tp) => {
  return tp < 10 ? `0${tp}` : `${tp}`;
};

const tsToTimeString = (ts) => {
  const minutes = fixedLengthTimePart(Math.round(ts / MINUTE_MS));
  const seconds = fixedLengthTimePart(Math.round((ts % MINUTE_MS) / SECOND_MS));
  return `${minutes}:${seconds}`;
};

const updateCounter = () => {
  fetch("/votes/ts")
    .then((response) => response.json())
    .then(({ ts }) => {
      const needToWait = ts > 0;
      addColorButton.classList.add("visible");
      if (needToWait) {
        colors.classList.add("inactive");
        addColorButton.innerHTML = tsToTimeString(ts);
        const interval = setInterval(() => {
          timePassed += INTERVAL_MS;
          const msLeft = ts - timePassed;
          if (msLeft > 0) {
            addColorButton.innerHTML = tsToTimeString(ts - timePassed);
          } else {
            clearInterval(interval);
            addColorButton.innerHTML = ADD_COLOR_TEXT;
            colors.classList.remove("inactive");
            timePassed = 0;
          }
        }, INTERVAL_MS);
      }
    });
};

colorButtons.forEach((colorButton) => {
  colorButton.addEventListener("change", () => {
    colorButtons.forEach((cb) => {
      if (cb.checked) {
        cb.parentElement.classList.remove("unchecked");
        cb.parentElement.classList.add("checked");
        addColorButton.style.backgroundColor = cb.value;
        const isWhite = cb.value === WHITE;
        const isYellow = cb.value === YELLOW;
        addColorButton.style.color = isWhite || isYellow ? BLACK : WHITE;
        addColorButton.style.border = isWhite ? BLACK_BORDER : 0;
        addColorButton.classList.remove("inactive");
      } else {
        cb.parentElement.classList.remove("checked");
        cb.parentElement.classList.add("unchecked");
      }
    });
  });
});

const setCanvasSize = () => {
  const { width, height } = canvas.getBoundingClientRect();
  canvas.width = width * Math.min(window.devicePixelRatio, 2);
  canvas.height = height * Math.min(window.devicePixelRatio, 2);
};

const setupCanvas = () => {
  setCanvasSize();
  context = canvas.getContext("2d");
};

const renderVotes = () => {
  if (votes.length > 1) {
    const maxLen = canvas.width;
    const aspect = canvas.height / canvas.width;
    const angle = 0;
    const gradient = context.createLinearGradient(
      // the start of the gradient added to the center
      canvas.width / 2 + Math.cos(angle) * maxLen * 0.5,
      canvas.height / 2 + Math.sin(angle) * maxLen * 0.5 * aspect,
      // the end of the gradient subtracted from the center
      canvas.width / 2 - Math.cos(angle) * maxLen * 0.5,
      canvas.height / 2 - Math.sin(angle) * maxLen * 0.5 * aspect
    );
    votes.forEach((vote, voteIndex) => {
      gradient.addColorStop(voteIndex / (votes.length - 1), vote.color);
    });
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
};

const fetchVotes = () => {
  fetch("/votes", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((response) => response.json())
    .then((votesData) => {
      votes = votesData.data;
      renderVotes();
    });
};

updateCounter();
fetchVotes();
setupCanvas();

window.addEventListener("resize", () => {
  setCanvasSize();
  renderVotes();
});
