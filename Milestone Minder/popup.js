document.getElementById('add-goal-btn').addEventListener('click', toggleGoalForm);
document.getElementById('save').addEventListener('click', saveGoal);
document.getElementById('export-btn').addEventListener('click', exportGoals);
document.getElementById('import-btn').addEventListener('click', () => document.getElementById('import-file').click());
document.getElementById('import-file').addEventListener('change', importGoals);

function toggleGoalForm() {
    const goalForm = document.getElementById('goal-form');
    goalForm.classList.toggle('hidden');
}

function saveGoal() {
    const category = document.getElementById('category').value;
    const goalName = document.getElementById('goal').value;
    const targetDate = new Date(document.getElementById('date').value).getTime();

    if (!category || !goalName || !targetDate) {
        alert("Please enter category, goal, and a target date.");
        return;
    }

    const goalData = {
        category,
        name: goalName,
        date: targetDate
    };

    chrome.storage.sync.get('goals', function (data) {
        const goals = data.goals || [];
        goals.push(goalData);

        chrome.storage.sync.set({ goals }, function () {
            displayGoals(goals);
        });
    });

    toggleGoalForm();
    document.getElementById('category').value = '';
    document.getElementById('goal').value = '';
    document.getElementById('date').value = '';
}

function displayGoals(goals) {
    const goalList = document.getElementById('goal-list');
    goalList.innerHTML = '';

    const groupedGoals = goals.reduce((acc, goal) => {
        if (!acc[goal.category]) {
            acc[goal.category] = [];
        }
        acc[goal.category].push(goal);
        return acc;
    }, {});

    for (const category in groupedGoals) {
        const categoryHeader = document.createElement('h3');
        categoryHeader.textContent = category;
        goalList.appendChild(categoryHeader);

        groupedGoals[category].forEach(goal => {
            const goalItem = document.createElement('div');
            goalItem.className = 'goal-item';
            goalItem.textContent = `Goal: ${goal.name} - `;

            const countdown = document.createElement('span');
            countdown.id = `countdown-${goal.name}`;
            goalItem.appendChild(countdown);
            goalList.appendChild(goalItem);

            const interval = setInterval(() => {
                const now = new Date().getTime();
                const distance = goal.date - now;

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
        });
    }
}

// Load the saved goals on popup open
chrome.storage.sync.get('goals', function (data) {
    if (data.goals) {
        displayGoals(data.goals);
    }
});

function exportGoals() {
    chrome.storage.sync.get('goals', function (data) {
        const goals = data.goals || [];
        const blob = new Blob([JSON.stringify(goals, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'goals.json';
        a.click();
    });
}

function importGoals(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const importedGoals = JSON.parse(e.target.result);
            chrome.storage.sync.set({ goals: importedGoals }, function () {
                displayGoals(importedGoals);
            });
        };
        reader.readAsText(file);
    }
}
