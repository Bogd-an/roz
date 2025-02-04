const app = document.getElementById('app');
const weekList = ['scheduleFirstWeek', 'scheduleSecondWeek'];
const urlGroupName = decodeURIComponent(window.location.search).replace("?", "").replace("-", "").toLowerCase();
const localStorageGroup = localStorage.getItem('selectedGroup');

async function fetchGroups() {
  const url = 'https://api.campus.kpi.ua/schedule/groups';
  try {
    const response = await fetch(url);
    const data = await response.json();
    const select = document.getElementById('group-select');

    let selectedGroupId = null;

    data.data.forEach(group => {
      const option = document.createElement('option');
      option.value = group.id;
      option.textContent = group.name;
      select.appendChild(option);

      const normalizedGroupName = group.name.replace("-", "").toLowerCase();

      if (normalizedGroupName === urlGroupName) {
        selectedGroupId = group.id;
      } else if (!selectedGroupId && localStorageGroup === group.id) {
        selectedGroupId = group.id;
      }
    });

    if (selectedGroupId) {
      select.value = selectedGroupId;
      fetchSchedule(selectedGroupId);
      localStorage.setItem('selectedGroup', selectedGroupId);
    }

    select.addEventListener('change', () => {
      const selectedId = select.value;
      localStorage.setItem('selectedGroup', selectedId);
      fetchSchedule(selectedId);
    });
  } catch (error) {
    console.error("Помилка завантаження груп", error);
  }
}

function createTables() {
  const tbody = document.querySelector(`#schedule-container`);
  tbody.innerHTML = "";
  weekList.forEach(week => {
    tbody.innerHTML +=
      `<div>
      <h2>${week.replace("schedule", "")}</h2>
      <table id="${week}">
        <thead><tr>
            <th>День</th>
            <th>Час</th>
            <th>Предмет</th>
            <th>Аудиторія</th>
            <th>Викладач</th>
        </tr></thead>
        <tbody></tbody>
      </table>
    </div>`;
  });
}

async function fetchSchedule(groupId) {
  if (!groupId) return;
  const url = `https://api.campus.kpi.ua/schedule/lessons?groupId=${groupId}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    weekList.forEach(week => {
      const tbody = document.querySelector(`#${week} tbody`);
      tbody.innerHTML = "";
      data.data[week].forEach(day => {
        day.pairs.sort((a, b) => a.time.localeCompare(b.time));

        day.pairs.forEach(pairs => {
          const row = document.createElement("tr");
          row.innerHTML = `
            <td>${day.day}</td>
            <td>${pairs.time}</td>
            <td>${pairs.name || "-"}</td>
            <td>${pairs.place || " "} ${pairs.type}</td>
            <td>${pairs.teacherName || "-"}</td>
          `;
          tbody.appendChild(row);
        });
      });
    });
    highlightCurrentLesson();
  } catch (error) {
    console.error("Помилка завантаження розкладу", error);
  }
}

async function fetchCurrentLesson() {
  const url = 'https://api.campus.kpi.ua/time/current';
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data.data; 
  } catch (error) {
    console.error("Помилка завантаження поточного часу", error);
  }
}

async function highlightCurrentLesson() {
  const { currentDay, currentLesson, currentWeek } = await fetchCurrentLesson();
  const lessonTimes = [
    "8:30", "10:25", "12:20", "14:15", "16:10", "18:30", "20:20"
  ];
  const weekName = [
    "Пн", "Вв", "Ср", "Чт", "Пт", "Сб"
  ];

  const rows = document.querySelectorAll(`#${weekList[currentWeek]} tbody tr`);
  let currentLessonRow = null;
  rows.forEach(row => {
    const dayCell = row.querySelector("td:first-child").textContent;
    const timeCell = row.querySelector("td:nth-child(2)").textContent;

    if (dayCell == weekName[currentDay - 1]) {
      row.classList.add("current-day");
      if (timeCell == lessonTimes[currentLesson - 1]) {
        row.classList.add("current-lesson"); 
        currentLessonRow = row;
      }
    } else {
      row.style.backgroundColor = "";
    }
  });

  if (currentLessonRow) {
    currentLessonRow.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });
  }
}

createTables();
fetchGroups();


// ////////////////////////////////////////////////////////////

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(reg => console.log("Service Worker зареєстровано", reg))
    .catch(err => console.error("Помилка реєстрації Service Worker", err));
}
async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.log("Браузер не підтримує сповіщення.");
    return;
  }

  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    console.log("Дозвіл на сповіщення отримано.");
    scheduleNotifications();
  } else {
    console.log("Дозвіл на сповіщення не надано.");
  }
}

requestNotificationPermission();
function scheduleNotifications() {
  fetchCurrentLesson().then(({ currentDay, currentLesson, currentWeek }) => {
    const lessonTimes = ["8:30", "10:25", "12:20", "14:15", "16:10", "18:30", "20:20"];
    if (!currentLesson) return;

    const [hours, minutes] = lessonTimes[currentLesson - 1].split(":").map(Number);
    const lessonTime = new Date();
    lessonTime.setHours(hours, minutes - 30, 0, 0); // Сповіщення за 30 хвилин

    const now = new Date();
    const timeDiff = lessonTime.getTime() - now.getTime();

    if (timeDiff > 0) {
      setTimeout(() => {
        new Notification("Нагадування!", {
          body: `Через 30 хвилин починається пара.`,
          icon: "/icon.png"
        });
      }, timeDiff);
    }
  });
}


