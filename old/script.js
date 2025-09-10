const DEBUG = false;

function headButton(name) {
    ['lesson', 'sessions', 'teacher'].forEach((name) => {
        document.querySelector(`#head-${name}`).classList.remove('head-a');
    });
    document.querySelector(`#head-${name}`).classList.add('head-a');
    const content = document.querySelector('#content');
    const scheduleContainer = document.querySelector('#schedule-container');
    switch (name) {
        case 'sessions':
            content.innerHTML = 'В процесі...';
            scheduleContainer.innerHTML = '';
            return;
        case 'teacher':
            content.innerHTML = 'В процесі...';
            scheduleContainer.innerHTML = '';
            return;
    }
    content.innerHTML =
        `
    <h8>
        <label for="group-select" >Оберіть групу:</label>
    </h8>
    
    `
    content.querySelector('h8').appendChild(selectElement);
    // initialize()

}

['lesson', 'sessions', 'teacher'].forEach((name) => {
    document.querySelector(`#head-${name}`).onclick = () => headButton(name);
});

let selectElement = document.createElement('select');
selectElement.id = 'group-select';
selectElement.onchange = function () { fetchSchedule(this); };

const urlGroupName = decodeURIComponent(window.location.search).replace("?", "").replace("-", "").toLowerCase();
const localStorageGroup = localStorage.getItem('selectedGroup');

async function fetchGroups() {
    const url = 'https://api.campus.kpi.ua/schedule/groups';
    try {

        let data, response;
        if (DEBUG) {
            response = await fetch('json/groups.json');
            data = await response.json();
        } else {
            response = await fetch(url);
            data = await response.json();
        }

        data.sort((a, b) => a.name.localeCompare(b.name, 'uk'));

        let selectedGroupId = null;

        data.forEach(group => {
            const option = document.createElement('option');
            option.value = group.id;
            option.textContent = group.name;
            selectElement.appendChild(option);
        });
        
    } catch (error) {
        console.error("Помилка завантаження груп", error);
    }
}

const weekList = ['scheduleFirstWeek', 'scheduleSecondWeek'];
const lessonTimes = ["08:30", "10:25", "12:20", "14:15", "16:10", "18:30", "20:20"];
const weekName = ["Пн", "Вв", "Ср", "Чт", "Пт", "Сб"];

function createTables() {
    const container = document.querySelector(`#schedule-container`);
    container.innerHTML = "";

    weekList.forEach(week => {
        const tableWrapper = document.createElement('div');

        tableWrapper.innerHTML = `<h2>${['Перший тиждень', 'Другий тиждень'][weekList.indexOf(week)]
            }</h2>`;

        const table = document.createElement("table");
        table.classList.add("schedule-table");
        table.id = week;

        const thead = document.createElement("thead");
        const headRow = document.createElement("tr");
        headRow.innerHTML = `<th>Час</th>`;
        weekName.forEach(day => {
            headRow.innerHTML += `<th>${day}</th>`;
        });
        thead.appendChild(headRow);
        table.appendChild(thead);

        const tbody = document.createElement("tbody");

        lessonTimes.forEach(time => {
            const row = document.createElement("tr");
            row.innerHTML = `<td>${time}</td>`;
            for (let i = 0; i < 6; i++) {
                const cell = document.createElement("td");
                cell.dataset.time = time;
                cell.dataset.day = i + 1; // 1 = Пн, 2 = Вт, ...
                cell.classList.add("schedule-cell");
                row.appendChild(cell);
            }
            tbody.appendChild(row);
        });

        table.appendChild(tbody);
        tableWrapper.appendChild(table);
        container.appendChild(tableWrapper);
    });
}

async function fetchSchedule(option) {
    const groupId = option.value;
    const groupName = option.options[option.selectedIndex].text;
    if (!groupId) return;
    localStorage.setItem('groupId', groupId);
    localStorage.setItem('groupName', groupName);
    if (DEBUG) console.log("Selected", groupName, groupId);
    fetchScheduleApi(groupId);
}
async function fetchScheduleApi(groupId) {
    createTables();

    const url = `https://api.campus.kpi.ua/schedule/lessons?groupId=${groupId}`;

    if (DEBUG) console.log("Fetching schedule ", url);

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (DEBUG) console.log(data);

        weekList.forEach(week => {
            data[week].forEach(day => {
                day.pairs.forEach(pair => {
                    const time = pair.time.length === 8 ? pair.time.substr(0, 5) : pair.time;
                    const dayIndex = weekName.indexOf(day.day); // 1 = Пн, 2 = Вт, ...
                    const cell = document.querySelector(`#${week} td[data-day="${dayIndex}"][data-time="${time}"]`);


                    let teacherNames = '';
                    let teacherData = { [pair.teacherName]: pair.lecturerId.lecturerId };
                    if (teacherData[pair.lecturer.name] == null) teacherData[pair.lecturer.name] = pair.lecturer.id;
                    Object.entries(teacherData).forEach(([key, value]) => {
                        if (DEBUG) console.log(`Ключ: ${key}, Значення: ${value}`);
                        if (key && value) teacherNames += `<a href=https://schedule.kpi.ua/lecturers?lecturerId=${value}">${key}</a>`;
                        else if (key) teacherNames += key;
                    });

                    let placeNames = pair.place || '';

                    if (placeNames) placeNames = `<a href="${pair.location.uri}">${placeNames}</a>`;
                    if (cell) {
                        const subjectBlock = document.createElement("div");
                        subjectBlock.classList.add("lesson-block");
                        subjectBlock.innerHTML = `
                        <strong>${pair.name || "-"}</strong><br>
                        <span>${teacherNames || "-"}</span><br>
                        <em>${placeNames} ${pair.type || ''}</em>
                        `;
                        cell.appendChild(subjectBlock);
                    }
                });
            });
        });
        highlightCurrentLesson();

    } catch (error) {
        console.error("Помилка завантаження розкладу", error);
    }
}

async function highlightCurrentLesson() {
    const { currentDay, currentLesson, currentWeek } = await fetchCurrentLesson();

    // Get all rows from the current week's table
    const rows = document.querySelectorAll(`#${weekList[currentWeek - 1]} tbody tr`);
    const weekDay = document.querySelectorAll(`#${weekList[currentWeek - 1]} thead tr th`);
    let currentLessonRow = null;
    if(DEBUG) console.log('currentDay, currentLesson, currentWeek ',currentDay, currentLesson, currentWeek);

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i].querySelectorAll(`td`);
        if(DEBUG) console.log('i, row ', i, row);
        // Get the time and day from the row
        for (let j = 1; j < row.length; j++) {
            if(currentWeek+1  == j ){
                row[j].classList.add("current-day");
                if (i + 1 === currentLesson) {
                    row[j].classList.add("current-lesson");
                    currentLessonRow = rows[i];
                }
            }
        }
    };

    // Scroll to the current lesson if found
    if (currentLessonRow) {
        currentLessonRow.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
    }
}

async function fetchCurrentLesson() {
    const url = 'https://api.campus.kpi.ua/time/current';
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (DEBUG) console.log("Current time data", data);
        return data;
    } catch (error) {
        console.error("Помилка завантаження поточного часу", error);
    }
}

async function initialize() {
    if(!!urlGroupName && localStorage.getItem('groupId')) 
        fetchScheduleApi(localStorage.getItem('groupId'));
    await fetchGroups();
    document.querySelector(`#head-lesson`).click();
    if(!!urlGroupName && localStorage.getItem('groupId'))
        clickGroup(localStorage.getItem('groupId'), false);
    if(!urlGroupName && localStorage.getItem('groupId')) 
        clickGroup(localStorage.getItem('groupId'), false);
}
initialize();

function clickGroup(id, needEvent = true) {
    const groupSelect = document.querySelector('#group-select');
        for (let i = 0; i < groupSelect.length; i++) {
            if (groupSelect[i].value == id) {
                groupSelect.selectedIndex = i;
                groupSelect.dispatchEvent(new Event('change'));
                break;
            }
        }
}

if (DEBUG) {
    setTimeout(() => {
        // clickGroup('4858379d-63fd-4084-a809-e97e356b2ee9') // ПК-51мп
    }, 1000)
}

