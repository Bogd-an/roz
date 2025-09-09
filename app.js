const weekList = ['scheduleFirstWeek', 'scheduleSecondWeek'];
const lessonTimes = [
  "8:30", "10:25", "12:20", "14:15", "16:10", "18:30", "20:20"
];
const weekName = [
  "Пн", "Вв", "Ср", "Чт", "Пт", "Сб"
];

const app = document.getElementById('app');

const urlGroupName = decodeURIComponent(window.location.search).replace("?", "").replace("-", "").toLowerCase();
const localStorageGroup = localStorage.getItem('selectedGroup');

async function fetchGroups() {
  const url = 'https://api.campus.kpi.ua/schedule/groups';
  try {
    const response = await fetch(url);
    const data = await response.json();
    const select = document.getElementById('group-select');

    let selectedGroupId = null;

    data.forEach(group => {
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
            <th>❌</th>
        </tr></thead>
        <tbody></tbody>
      </table>
    </div>`;
  });
}

async function fetchSchedule(groupId) {
  if (!groupId) return;
  const url = `https://api.campus.kpi.ua/schedule/lessons?groupId=${groupId}`;
  console.log("Fetching schedule ", url);
  try {
    const response = await fetch(url);
    const data = await response.json();
    weekList.forEach(week => {
      const tbody = document.querySelector(`#${week} tbody`);
      tbody.innerHTML = "";
      data[week].forEach(day => {
        day.pairs.sort((a, b) => {
          const timeToMinutes = (time) => {
            const [hours, minutes] = time.split(":").map(Number);
            return hours * 60 + minutes;
          };
          return timeToMinutes(a.time) - timeToMinutes(b.time);
        });
        

        day.pairs.forEach(pairs => {
          const row = document.createElement("tr");
          if (pairs.time.length == 8) pairs.time = pairs.time.substr(0, 5);
          row.innerHTML = `
            <td>${day.day}</td>
            <td>${pairs.time}</td>
            <td>${pairs.name || "-"}</td>
            <td>${pairs.place || " "} ${pairs.type}</td>
            <td>${pairs.teacherName || "-"}</td>
            <td><input type="checkbox" onclick="hidePair(this)"></td>
          `;
          tbody.appendChild(row);
        });
      });
    });
    highlightCurrentLesson();
    hidePairLocalStorage();
  } catch (error) {
    console.error("Помилка завантаження розкладу", error);
  }
}

function hidePair(checkbox) {
  const row = checkbox.closest("tr");
  if (!row) return;

  const pairName = row.children[2].textContent.trim(); // Отримуємо назву пари
  let hiddenPairs = JSON.parse(localStorage.getItem("hiddenPairs")) || [];
  const shouldHide = checkbox.checked;

  if (shouldHide) {
    if (!hiddenPairs.includes(pairName)) {
      hiddenPairs.push(pairName);
    }
  } else {
    hiddenPairs = hiddenPairs.filter(name => name !== pairName);
  }

  localStorage.setItem("hiddenPairs", JSON.stringify(hiddenPairs));

  document.querySelectorAll("tr").forEach(tr => {
    if (tr.children[2] && tr.children[2].textContent.trim() === pairName) {
      tr.classList.toggle("hidePair", shouldHide);
      const input = tr.querySelector("input[type='checkbox']");
      if (input) {
        input.checked = shouldHide; // Оновлюємо стан чекбоксів у всіх рядках з тією ж парою
      }
    }
  });
}

function hidePairLocalStorage() {
  let hiddenPairs = JSON.parse(localStorage.getItem("hiddenPairs")) || [];

  document.querySelectorAll("tr").forEach(tr => {
    const pairName = tr.children[2]?.textContent.trim();
    if (pairName && hiddenPairs.includes(pairName)) {
      tr.classList.add("hidePair");
      const input = tr.querySelector("input[type='checkbox']");
      if (input) {
        input.checked = true; // Активуємо всі чекбокси для прихованих пар
      }
    }
  });
}


async function fetchCurrentLesson() {
  const url = 'https://api.campus.kpi.ua/time/current';
  try {
    const response = await fetch(url);
    const data = await response.json();
    // console.log("Current time data", data);
    return data; 
  } catch (error) {
    console.error("Помилка завантаження поточного часу", error);
  }
}

async function highlightCurrentLesson() {
  const { currentDay, currentLesson, currentWeek } = await fetchCurrentLesson();
  const rows = document.querySelectorAll(`#${weekList[currentWeek-1]} tbody tr`);
  let currentLessonRow = null;
  rows.forEach(row => {
    const dayCell = row.querySelector("td:first-child").textContent;
    const timeCell = row.querySelector("td:nth-child(2)").textContent;

    if (dayCell == weekName[currentDay - 1]) {
      row.classList.add("current-day");
      if (timeCell == lessonTimes[currentLesson-1]) {
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

// if ('serviceWorker' in navigator) {
//   navigator.serviceWorker.register('/sw.js')
//     .then(reg => console.log("Service Worker зареєстровано", reg))
//     .catch(err => console.error("Помилка реєстрації Service Worker", err));
// }
// async function requestNotificationPermission() {
//   if (!('Notification' in window)) {
//     console.log("Браузер не підтримує сповіщення.");
//     return;
//   }

//   const permission = await Notification.requestPermission();
//   if (permission === 'granted') {
//     console.log("Дозвіл на сповіщення отримано.");
//     scheduleNotifications();
//   } else {
//     console.log("Дозвіл на сповіщення не надано.");
//   }
// }

// requestNotificationPermission();
// function scheduleNotifications() {
//   fetchCurrentLesson().then(({ currentDay, currentLesson, currentWeek }) => {
//     const lessonTimes = ["8:30", "10:25", "12:20", "14:15", "16:10", "18:30", "20:20"];
//     if (!currentLesson) return;

//     const [hours, minutes] = lessonTimes[currentLesson - 1].split(":").map(Number);
//     const lessonTime = new Date();
//     lessonTime.setHours(hours, minutes - 30, 0, 0); // Сповіщення за 30 хвилин

//     const now = new Date();
//     const timeDiff = lessonTime.getTime() - now.getTime();

//     if (timeDiff > 0) {
//       setTimeout(() => {
//         new Notification("Нагадування!", {
//           body: `Через 30 хвилин починається пара.`,
//           icon: "/icon.png"
//         });
//       }, timeDiff);
//     }
//   });
// }


// Функція для створення зашифрованого посилання
function createShareLink() {
  // Отримуємо необхідні дані з localStorage
  const selectedGroup = localStorage.getItem('selectedGroup');
  const hiddenPairs = localStorage.getItem('hiddenPairs');

  // Створюємо об'єкт з параметрами
  const params = {
    selectedGroup: selectedGroup,
    hiddenPairs: hiddenPairs
  };

  // Перетворюємо об'єкт у рядок JSON
  const jsonString = JSON.stringify(params);

  // Перетворюємо рядок JSON у масив байтів (UTF-8)
  const encoder = new TextEncoder();
  const utf8Bytes = encoder.encode(jsonString);

  // Шифруємо масив байтів в Base64
  const encodedParams = btoa(String.fromCharCode.apply(null, utf8Bytes));

  // Створюємо URL
  const shareUrl = `${window.location.origin}${window.location.pathname}?data=${encodedParams}`;

  return shareUrl;
}
// Декодування параметрів з URL
function getParamsFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  const encodedParams = urlParams.get('data');
  if (encodedParams) {
    // Декодуємо Base64
    const decodedString = atob(encodedParams);

    // Перетворюємо декодовану строку в масив байтів
    const decoder = new TextDecoder();
    const decodedBytes = new Uint8Array(decodedString.length);
    for (let i = 0; i < decodedString.length; i++) {
      decodedBytes[i] = decodedString.charCodeAt(i);
    }

    // Перетворюємо масив байтів у рядок JSON
    const decodedParams = JSON.parse(decoder.decode(decodedBytes));
    
    // Зберігаємо параметри в localStorage
    localStorage.setItem('selectedGroup', decodedParams.selectedGroup);
    localStorage.setItem('hiddenPairs', decodedParams.hiddenPairs);

    // Завантажуємо розклад для нової групи
    fetchSchedule(decodedParams.selectedGroup);
  }
}
function copyShareLink() {
  const shareUrl = createShareLink();
  const textArea = document.createElement('textarea');
  textArea.value = shareUrl;
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand('copy');
  document.body.removeChild(textArea);

  alert('Посилання скопійовано!');
}


// Додаємо кнопку для поділу
const shareButton = document.createElement('button');
shareButton.textContent = 'Поділитись посиланням на групу та приховані пари';
shareButton.onclick = copyShareLink;
document.body.appendChild(shareButton);


// Викликаємо функцію при завантаженні сторінки
getParamsFromUrl();
