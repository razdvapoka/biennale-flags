const voteButton = document.querySelector(".vote");
const counter = document.querySelector(".counter");

const INTERVAL_MS = 1000;

voteButton.addEventListener("click", () => {
  fetch("/votes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ color: "#ff00ff" }),
  })
    .then((response) => response.json())
    .then((data) => {
      console.log(data);
      if (!data.error) {
        voteButton.disabled = true;
      }
      updateCounter();
    })
    .catch((error) => {
      console.error("Error:", error);
    });
});

let timePassed = 0;

const updateCounter = () => {
  fetch("/votes/ts")
    .then((response) => response.json())
    .then(({ ts }) => {
      voteButton.disabled = ts > 0;
      voteButton.classList.add("visible");
      if (ts > 0) {
        counter.classList.add("visible");
        counter.innerHTML = ts;
        const interval = setInterval(() => {
          timePassed += INTERVAL_MS;
          const msLeft = ts - timePassed;
          if (msLeft > 0) {
            counter.innerHTML = ts - timePassed;
          } else {
            clearInterval(interval);
            counter.classList.remove("visible");
            voteButton.disabled = false;
            timePassed = 0;
          }
        }, INTERVAL_MS);
      }
    });
};

updateCounter();

console.log("hey!");
