document.getElementById('save').addEventListener('click', saveGoal);

function saveGoal() {
    const goalName = document.getElementById('goal').value;
    const targetDate = new Date(document.getElementById('date').value).getTime();

    if (!goalName || !targetDate) {
        alert("Please enter both a goal and a target date.");
        return;
    }

    const goalData = {
        name: goalName,
        date: targetDate
    };

    chrome.storage.sync.set({ goalData }, function () {
        displayGoal(goalData);
    });
}

function displayGoal(goalData) {
    const displayGoal = document.getElementById('display-goal');
    const countdown = document.getElementById('countdown');

    displayGoal.textContent = `Goal: ${goalData.name}`;

    const interval = setInterval(() => {
        const now = new Date().getTime();
        const distance = goalData.date - now;

        if (distance < 0) {
            clearInterval(interval);
            countdown.textContent = "Goal Reached!";
            return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        countdown.textContent = `${days}d ${hours}h ${minutes}m ${seconds}s remaining`;
    }, 1000);
}

// Load the saved goal on popup open
chrome.storage.sync.get('goalData', function (data) {
    if (data.goalData) {
        displayGoal(data.goalData);
    }
});
