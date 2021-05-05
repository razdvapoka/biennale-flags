const INTERVAL_MS = 1000;
const SECOND_MS = 1000;
const MINUTE_MS = SECOND_MS * 60;
const BLACK = "#000000";
const WHITE = "#FFFFFF";
const YELLOW = "#FFD100";
const BLACK_BORDER = `1px solid ${BLACK}`;
const NO_BORDER = "0";
const ADD_COLOR_TEXT = "add color";
const TRANSITION_FRACTION = 0.1;

let timePassed = 0;
let votesByDay = [];
let context = null;

const conceptButton = document.querySelector(".concept");
const addColorButton = document.querySelector(".add-color");
const colorButtons = document.querySelectorAll(".color > input");
const colors = document.querySelector(".colors");
const form = document.querySelector("form");
const canvas = document.querySelector("canvas");
const downloadLink = document.querySelector(".download-link");
const conceptBox = document.querySelector(".concept-box");
const main = document.querySelector("main");
const deleteButton = document.querySelector(".debug-delete");
const dayCounter = document.querySelector(".day-counter");
const voteCounter = document.querySelector(".vote-counter");

const deleteVotes = () => {
  fetch("/votes", {
    method: "DELETE",
  }).then(() => {
    alert("your votes were successfully deleted, vote again!");
  });
};

deleteButton.addEventListener("click", deleteVotes);

const toggleConept = (e) => {
  conceptBox.classList.toggle("concept-box-open");
  main.classList.toggle("down");
  conceptButton.classList.toggle("concept-close");
};

conceptButton.addEventListener("click", toggleConept);

const downloadAsImage = () => {
  downloadLink.setAttribute("download", "world-wide-flag.png");
  downloadLink.setAttribute(
    "href",
    canvas.toDataURL("image/png").replace("image/png", "image/octet-stream")
  );
  downloadLink.click();
};

const resetAddColorButton = () => {
  addColorButton.style.backgroundColor = BLACK;
  addColorButton.style.color = WHITE;
  addColorButton.style.border = NO_BORDER;
  addColorButton.classList.add("inactive");
};

const handleSubmitVote = (e) => {
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
      if (!data.error) {
        resetAddColorButton();
        colors.classList.add("inactive");
        colorButtons.forEach((cb) => {
          cb.parentElement.classList.remove("checked", "unchecked");
          cb.checked = false;
        });
      }
      updateCounter();
      fetchVotes();
    })
    .catch((error) => {
      console.error("Error:", error);
    });
};

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

const renderFlag = () => {
  votesByDay.forEach((votes, dayIndex) => {
    renderVotes(votes, dayIndex, votesByDay.length);
  });
};

const renderVotes = (votes, dayIndex, daysCount) => {
  const gradient = context.createLinearGradient(0, 0, canvas.width, 0);
  if (votes && votes.length > 0) {
    if (votes.length > 1) {
      const stops = votes.flatMap((vote, voteIndex) => {
        const isFirstVote = voteIndex === 0;
        const isLastVote = voteIndex === votes.length - 1;
        const diff = isLastVote
          ? 1 - vote.stop
          : votes[voteIndex + 1].stop - vote.stop;
        const tf = diff > TRANSITION_FRACTION ? TRANSITION_FRACTION : diff / 2;
        const firstStop = isFirstVote ? 0 : vote.stop + tf;
        const lastStop = isLastVote ? 1 : votes[voteIndex + 1].stop - tf;
        return [
          [firstStop, vote.color],
          [lastStop, vote.color],
        ];
      });

      stops.forEach((stop) => gradient.addColorStop(...stop));
    } else {
      const singleVote = votes[0];
      gradient.addColorStop(0, singleVote.color);
      gradient.addColorStop(1, singleVote.color);
    }
  }
  context.fillStyle = gradient;
  const dayHeight = canvas.height / daysCount;
  const y = dayHeight * dayIndex;
  context.fillRect(0, y, canvas.width, dayHeight);
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
      votesByDay = votesData.data;
      renderFlag();
      dayCounter.innerText = votesByDay.length;
      const voteCount = votesByDay.reduce((sum, day) => sum + day.length, 0);
      voteCounter.innerText = voteCount;
    });
};

const handleResize = () => {
  setCanvasSize();
  renderFlag();
};

const init = () => {
  updateCounter();
  fetchVotes();
  setupCanvas();

  setInterval(fetchVotes, 1000);

  form.addEventListener("submit", handleSubmitVote, false);
  canvas.addEventListener("click", downloadAsImage);
  window.addEventListener("resize", handleResize);
};

init();
