// 🌐 Global state variables
let facilities = [];
let currentSearch = '';
let currentSort = 'name';
let currentSport = 'all';
let currentVenue = '';
let currentMonth = '';
let venueAnalyticsData = {};

// 📥 Load all venues from AnalyticsAPI
function loadFacilities() {
  fetch('AnalyticsAPI.php?action=fetch_venues')
    .then(response => response.json())
    .then(data => {
      if (!Array.isArray(data.venues)) {
        console.error('Invalid data format:', data);
        return;
      }
      facilities = data.venues;
      applyFilters();
    })
    .catch(error => {
      console.error('Error loading facilities:', error);
      const venueGrid = document.getElementById('venueCards');
      if (venueGrid) {
        venueGrid.innerHTML = '<div class="no-venues-message">Failed to load venues.</div>';
      }
    });
}

// 🖼️ Display venue cards in the UI
function displayVenues(data) {
  const grid = document.getElementById('venueCards');
  grid.innerHTML = '';

  if (data.length === 0) {
    grid.innerHTML = '<div class="no-venues-message">No venues match your filters.</div>';
    return;
  }

  data.forEach(facility => {
    const card = document.createElement('div');
    card.className = 'venue-card';
    card.innerHTML = `
      <img src="${facility.image_url || 'default.jpg'}" class="venue-image" />
      <div class="venue-name">${facility.place_name}</div>
      <div class="venue-sport">${facility.SportCategory}</div>
      <div class="venue-rating">📍 ${facility.location || 'Unknown location'}</div>
      <button class="view-button" onclick="openBookings('${facility.place_name}')">View Analytics</button>
    `;
    grid.appendChild(card);
  });
}

// 🧠 Apply filters and sorting on venue data
function applyFilters() {
  let result = facilities;
  if (currentSearch.trim()) {
    result = result.filter(f => f.place_name.toLowerCase().startsWith(currentSearch.toLowerCase()));
  }
  if (currentSport !== 'all') {
    result = result.filter(f => f.SportCategory.toLowerCase() === currentSport.toLowerCase());
  }
  if (currentSort === 'name') {
    result.sort((a, b) => a.place_name.localeCompare(b.place_name));
  } else if (currentSort === 'name-desc') {
    result.sort((a, b) => b.place_name.localeCompare(a.place_name));
  }
  displayVenues(result);
}

// 🚀 Initialize on page load
window.onload = () => {
  loadFacilities();
  loadSports();

  // 🔎 Handle user input and filters
  document.getElementById('searchInput').addEventListener('input', e => {
    currentSearch = e.target.value;
    applyFilters();
  });
  document.getElementById('sortSelect').addEventListener('change', e => {
    currentSort = e.target.value;
    applyFilters();
  });
  document.getElementById('sportSelect').addEventListener('change', e => {
    currentSport = e.target.value;
    applyFilters();
  });
};

// 🎯 Load all sports categories from API
function loadSports() {
  fetch('AnalyticsAPI.php?action=fetch_sports')
    .then(response => response.json())
    .then(data => {
      const sportSelect = document.getElementById('sportSelect');
      data.sports.forEach(sport => {
        const option = document.createElement('option');
        option.value = sport.sport_name.toLowerCase();
        option.textContent = sport.sport_name;
        sportSelect.appendChild(option);
      });
    })
    .catch(error => console.error('Error loading sports:', error));
}

// 📊 Open analytics view for a selected venue
function openBookings(venueName) {
  const year = document.getElementById("yearSelect").value;
  currentVenue = venueName;
  currentMonth = 'January';

  document.getElementById("venueTitle").textContent = `Bookings for ${venueName}`;
  document.getElementById("bookingPage").style.display = "flex";
  document.getElementById("cardSection").style.display = "none";

  fetchMonthlyData(venueName, year);
}

// 📅 Fetch monthly analytics from API
function fetchMonthlyData(venueName, year) {
  const url = `AnalyticsAPI.php?action=fetch_monthly_analytics&venue=${encodeURIComponent(venueName)}&year=${year}`;
  fetch(url)
    .then(res => res.json())
    .then(data => {
      venueAnalyticsData = data.data || {};
      populateMonthButtons(Object.keys(venueAnalyticsData));
      showMonth("January");
    })
    .catch(err => {
      console.error("❌ Error fetching monthly data:", err);
    });
}

// 📆 Show or hide month buttons depending on available data
function populateMonthButtons(months) {
  document.querySelectorAll('.month-btn').forEach(btn => {
    if (btn.textContent !== 'All') {
      btn.style.display = months.includes(btn.textContent) ? 'block' : 'none';
    }
  });
}

// 📈 Show table data for selected month
function showMonth(month) {
  currentMonth = month;
  const tableBody = document.getElementById("dailyBookingTable");
  const summaryRow = document.getElementById("summaryRow");
  tableBody.innerHTML = '';

  if (month === 'All') {
    let monthTotals = {};

    Object.entries(venueAnalyticsData).forEach(([monthName, entries]) => {
      let monthlyBookings = 0;
      let monthlyRevenue = 0;
      entries.forEach(entry => {
        monthlyBookings += entry.bookings;
        monthlyRevenue += entry.total;
      });
      monthTotals[monthName] = {
        bookings: monthlyBookings,
        total: monthlyRevenue
      };
    });

    Object.entries(monthTotals).forEach(([monthName, summary]) => {
      tableBody.innerHTML += `
        <tr>
          <td>${monthName}</td>
          <td>${summary.bookings}</td>
          <td>${summary.total.toFixed(2)} ₪</td>
        </tr>`;
    });

    const totalBookings = Object.values(monthTotals).reduce((sum, m) => sum + m.bookings, 0);
    const totalRevenue = Object.values(monthTotals).reduce((sum, m) => sum + m.total, 0);

    summaryRow.innerHTML = `
      <span>Total Bookings: ${totalBookings}</span>
      <span>Total Revenue: ₪${totalRevenue.toFixed(2)}</span>
    `;
  } else {
    const data = venueAnalyticsData[month] || [];
    let totalBookings = 0;
    let totalRevenue = 0;

    data.forEach(entry => {
      tableBody.innerHTML += `
        <tr>
          <td>${entry.date}</td>
          <td>${entry.bookings}</td>
          <td>${entry.total} ₪</td>
        </tr>`;
      totalBookings += entry.bookings;
      totalRevenue += entry.total;
    });

    summaryRow.innerHTML = `
      <span>Total Bookings: ${totalBookings}</span>
      <span>Total Revenue: ₪${totalRevenue.toFixed(2)}</span>
    `;
  }

  // Highlight selected month button
  document.querySelectorAll('.month-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = Array.from(document.querySelectorAll('.month-btn')).find(b => b.textContent === month);
  if (activeBtn) activeBtn.classList.add('active');
}

// ⬅️ Back to venue cards view
function goBack() {
  document.getElementById("bookingPage").style.display = "none";
  document.getElementById("cardSection").style.display = "block";
}

// 🧾 Export bookings data to PDF
function downloadPDF() {
  const element = document.getElementById("pdfContent");
  const opt = {
    margin: 0.5,
    filename: 'bookings-report.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
  };
  html2pdf().set(opt).from(element).save();
}

// Expose function to global scope
window.openBookings = openBookings;
