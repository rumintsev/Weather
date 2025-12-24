const cardsEl = document.querySelector(".cards");
const statusEl = document.querySelector(".status");
const cityInput = document.querySelector(".cityInput");
const suggestionsEl = document.querySelector(".suggestions");
const cityError = document.querySelector(".cityError");
const refreshBtn = document.querySelector(".refreshBtn");
const dayLabels = ["Завтра", "Послезавтра"];

let locations = JSON.parse(localStorage.getItem("locations")) || [];
let lastSuggestions = [];

function saveLocations() {
  localStorage.setItem("locations", JSON.stringify(locations));
}

function setStatus(text) {
  statusEl.textContent = text;
}

function clearCards() {
  while (cardsEl.firstChild) {
    cardsEl.removeChild(cardsEl.firstChild);
  }
}

function locationExists(label) {
  return locations.some(loc => loc.label === label);
}

function removeLocation(label) {
  locations = locations.filter(loc => loc.label !== label);
  saveLocations();
  const cardToRemove = [...cardsEl.children].find(card => {
    const title = card.querySelector("strong");
    return title && title.textContent === label;
  });
  if (cardToRemove) {
    cardsEl.removeChild(cardToRemove);
  }
}

function getWeatherStyle(temp) {
  if (temp < 4) return { className: "cold", icon: "❄️" };
  if (temp < 14) return { className: "mild", icon: "🌥" };
  return { className: "warm", icon: "☀️" };
}

function createCard(location) {
  const card = document.createElement("div");
  card.className = "card";

  const header = document.createElement("div");
  header.className = "cardHeader";

  const title = document.createElement("strong");
  title.textContent = location.label;

  const removeBtn = document.createElement("button");
  removeBtn.textContent = "✕";
  removeBtn.onclick = () => removeLocation(location.label);

  header.appendChild(title);
  header.appendChild(removeBtn);
  card.appendChild(header);

  const content = document.createElement("div");
  content.className = "content";
  content.textContent = "Загрузка...";
  card.appendChild(content);

  cardsEl.appendChild(card);

  return { card, content, header };
}

async function loadWeather(location) {
  const { card, content, header } = createCard(location);

  try {
    const url =
      "https://api.open-meteo.com/v1/forecast" +
      "?latitude=" + location.lat +
      "&longitude=" + location.lon +
      "&daily=temperature_2m_max" +
      "&forecast_days=3" +
      "&timezone=auto";

    const response = await fetch(url);
    if (!response.ok) throw new Error();

    const data = await response.json();
    content.textContent = "";
    const temps = data.daily.temperature_2m_max;
    const style = getWeatherStyle(temps[0]);

    card.classList.add(style.className);

    const icon = document.createElement("div");
    icon.className = "icon";
    icon.textContent = style.icon;
    header.prepend(icon);

    temps.forEach((temp, index) => {
      const row = document.createElement("div");
      if (index == 0) {
        row.textContent = temp + "°C";
      }
      else {
        row.textContent = dayLabels[index-1] + ": " + temp + "°C";
      }
      content.appendChild(row);
    });
  } catch {
    content.textContent = "Ошибка загрузки";
  }
}

async function updateAll() {
  clearCards();
  setStatus("Загрузка погоды...");
  for (const location of locations) {
    await loadWeather(location);
  }
  setStatus("");
}

function addLocation(location) {
  if (locationExists(location.label)) {
    cityError.textContent = "Этот город уже добавлен";
    return;
  }
  locations.push(location);
  saveLocations();
  loadWeather(location);
}

function requestGeo() {
  navigator.geolocation.getCurrentPosition(
    pos => {
      addLocation({
        label: "Текущее местоположение",
        lat: pos.coords.latitude,
        lon: pos.coords.longitude
      });
    },
    () => {
      setStatus("Геолокация отклонена. Введите город в поисковую строку.");
    }
  );
}

async function loadCitySuggestions(query) {
  suggestionsEl.textContent = "";
  lastSuggestions = [];

  if (query.length < 3) return;

  try {
    const url =
      "https://geocoding-api.open-meteo.com/v1/search" +
      "?name=" + encodeURIComponent(query) +
      "&count=5&language=ru";

    const response = await fetch(url);
    if (!response.ok) throw new Error();

    const data = await response.json();
    if (!data.results) return;

    lastSuggestions = data.results;

    data.results.forEach(city => {
      const item = document.createElement("div");
      item.className = "suggestion";
      item.textContent = city.name + ", " + city.country;

      item.onclick = () => {
        cityInput.value = "";
        suggestionsEl.textContent = "";
        cityError.textContent = "";

        addLocation({
          label: city.name + ", " + city.country,
          lat: city.latitude,
          lon: city.longitude
        });
      };

      suggestionsEl.appendChild(item);
    });
  } catch {
    cityError.textContent = "Ошибка поиска города";
  }
}

cityInput.addEventListener("input", () => {
  cityError.textContent = "";
  loadCitySuggestions(cityInput.value.trim());
});

refreshBtn.onclick = updateAll;

if (locations.length === 0) {
  requestGeo();
} else {
  updateAll();
}