document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('add-goal-btn');
    const goalForm = document.getElementById('goal-form');
    const saveBtn = document.getElementById('save');
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const importFile = document.getElementById('import-file');
    const categoryInput = document.getElementById('category');
    const categorySuggestions = document.getElementById('category-suggestions');

    // State to store currently editing goal
    let editingGoal = null;

    if (!toggleBtn || !goalForm || !saveBtn || !exportBtn || !importBtn || !importFile || !categoryInput || !categorySuggestions) {
        console.error("One or more elements not found in the DOM");
        return;
    }

    // Event listeners
    toggleBtn.addEventListener('click', toggleGoalForm);
    saveBtn.addEventListener('click', saveGoal);
    exportBtn.addEventListener('click', exportGoals);
    importBtn.addEventListener('click', () => importFile.click());
    importFile.addEventListener('change', importGoals);
    categoryInput.addEventListener('input', showCategorySuggestions);
    categorySuggestions.addEventListener('click', selectCategory);

    function toggleGoalForm() {
        if (goalForm.classList.contains('hidden')) {
            goalForm.classList.remove('hidden');
            toggleBtn.classList.add('cancel');
            toggleBtn.classList.remove('add');
        } else {
            goalForm.classList.add('hidden');
            toggleBtn.classList.add('add');
            toggleBtn.classList.remove('cancel');
        }
    }

    function saveGoal() {
        const category = document.getElementById('category').value.trim();
        const goalName = document.getElementById('goal').value.trim();
        const targetDate = new Date(document.getElementById('date').value).getTime();

        if (!category || !goalName || !targetDate) {
            alert("Please enter category, goal, and a target date.");
            return;
        }

        const goalData = {
            category: category,
            name: goalName,
            date: targetDate
        };

        chrome.storage.sync.get('goals', function (data) {
            const goals = data.goals || [];

            if (editingGoal) {
                // Update existing goal
                const updatedGoals = goals.map(goal =>
                    goal.name === editingGoal.name && goal.category === editingGoal.category
                        ? goalData
                        : goal
                );
                chrome.storage.sync.set({ goals: updatedGoals }, function () {
                    displayGoals(updatedGoals);
                });
                editingGoal = null;
            } else {
                // Add new goal
                goals.push(goalData);
                chrome.storage.sync.set({ goals }, function () {
                    displayGoals(goals);
                });
            }
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
            categoryHeader.className = 'category-header';
            categoryHeader.textContent = category;

            const iconDiv = document.createElement('div');
            iconDiv.className = 'icons hidden';
            const editBtn = document.createElement('button');
            editBtn.className = 'edit-icon';
            editBtn.title = 'Edit';
            editBtn.textContent = '✎'; // Edit icon
            editBtn.addEventListener('click', () => editCategory(category));
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-icon';
            deleteBtn.title = 'Delete';
            deleteBtn.textContent = '✘'; // Delete icon
            deleteBtn.addEventListener('click', () => deleteCategory(category));
            iconDiv.appendChild(editBtn);
            iconDiv.appendChild(deleteBtn);
            categoryHeader.appendChild(iconDiv);

            goalList.appendChild(categoryHeader);

            groupedGoals[category].forEach(goal => {
                const goalItem = document.createElement('div');
                goalItem.className = 'goal-item';
                goalItem.innerHTML = `Goal: ${goal.name} - `;

                const countdown = document.createElement('span');
                countdown.id = `countdown-${goal.name}`;
                goalItem.appendChild(countdown);

                const iconDiv = document.createElement('div');
                iconDiv.className = 'icons hidden';
                const editBtn = document.createElement('button');
                editBtn.className = 'edit-icon';
                editBtn.title = 'Edit';
                editBtn.textContent = '✎'; // Edit icon
                editBtn.addEventListener('click', () => startEditingGoal(goal));
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'delete-icon';
                deleteBtn.title = 'Delete';
                deleteBtn.textContent = '✘'; // Delete icon
                deleteBtn.addEventListener('click', () => deleteGoal(goal.name));
                iconDiv.appendChild(editBtn);
                iconDiv.appendChild(deleteBtn);

                goalItem.appendChild(iconDiv);
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

    function showCategorySuggestions() {
        const input = categoryInput.value.trim();
        const categorySuggestions = document.getElementById('category-suggestions');
        categorySuggestions.innerHTML = '';

        if (input.length === 0) {
            categorySuggestions.classList.add('hidden');
            return;
        }

        chrome.storage.sync.get('goals', function (data) {
            const goals = data.goals || [];
            const categories = Array.from(new Set(goals.map(goal => goal.category)));
            const filteredCategories = categories.filter(category => category.toLowerCase().includes(input.toLowerCase()));

            if (filteredCategories.length) {
                filteredCategories.forEach(category => {
                    const li = document.createElement('li');
                    li.textContent = category;
                    li.dataset.category = category;
                    categorySuggestions.appendChild(li);
                });
                categorySuggestions.classList.remove('hidden');
            } else {
                categorySuggestions.classList.add('hidden');
            }
        });
    }

    function selectCategory(event) {
        if (event.target.tagName === 'LI') {
            categoryInput.value = event.target.dataset.category;
            categorySuggestions.classList.add('hidden');
        }
    }

    document.addEventListener('click', (event) => {
        if (!goalForm.contains(event.target) && !categorySuggestions.contains(event.target)) {
            categorySuggestions.classList.add('hidden');
        }
    });

    function startEditingGoal(goal) {
        document.getElementById('category').value = goal.category;
        document.getElementById('goal').value = goal.name;
        document.getElementById('date').value = new Date(goal.date).toISOString().split('T')[0];
        editingGoal = goal;
        toggleGoalForm();
    }

    function editCategory(category) {
        // Implement your category editing logic here
        console.log(`Edit category: ${category}`);
    }

    function deleteCategory(category) {
        chrome.storage.sync.get('goals', function (data) {
            let goals = data.goals || [];
            goals = goals.filter(goal => goal.category !== category);
            chrome.storage.sync.set({ goals }, function () {
                displayGoals(goals);
            });
        });
    }

    function deleteGoal(goalName) {
        chrome.storage.sync.get('goals', function (data) {
            let goals = data.goals || [];
            goals = goals.filter(goal => goal.name !== goalName);
            chrome.storage.sync.set({ goals }, function () {
                displayGoals(goals);
            });
        });
    }

    // Load the saved goals on popup open
    chrome.storage.sync.get('goals', function (data) {
        if (data.goals) {
            displayGoals(data.goals);
        }
    });
});
