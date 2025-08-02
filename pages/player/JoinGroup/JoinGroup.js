let allGroups = [];
let userLocation = null;
let selectedGroup = null;

function toggleFavorite(element) {
  element.classList.toggle("active");
}

window.onload = function () {
  // Try to get user location, but don't block if it fails
  getUserLocation().then(location => {
    userLocation = location;
    loadGroups();
  }).catch(err => {
    console.log("Location access denied, loading groups without distance calculation");
    userLocation = null;
    loadGroups();
  });
};

function loadGroups() {
      fetch("./JoinGroupAPI.php")
    .then(res => res.json())
    .then(data => {
      if (data.success && Array.isArray(data.groups)) {
        allGroups = data.groups.map(group => ({
          ...group,
          distance: userLocation ? calculateDistance(
            userLocation.lat,
            userLocation.lng,
            parseFloat(group.latitude),
            parseFloat(group.longitude)
          ) : null
        }));
        renderGroups(allGroups);
      } else {
        console.error("Invalid response format:", data);
      }
    })
    .catch(err => {
      console.error("Failed to fetch groups:", err);
    });
}

function renderGroups(groups) {
  const container = document.getElementById("groupsContainer");
  if (!container) {
    console.error("groupsContainer not found!");
    return;
  }
  container.innerHTML = "";

  groups.forEach(group => {
    const isPrivate = group.privacy === 'private';
    const current = group.current_members;
    const max = group.max_members;

    const card = document.createElement("div");
    card.className = "venue-card";
    card.setAttribute("data-group-type", group.privacy);
    if (isPrivate) card.setAttribute("data-access-code", group.group_password);

    const groupDataEncoded = JSON.stringify(group).replace(/'/g, "&apos;");

    card.innerHTML = `
      <div class="venue-card-header">
        <span class="group-badge ${group.privacy}">${group.privacy.toUpperCase()}</span>
      </div>
      <div class="venue-image">
        <img src="${group.image_url}" alt="Venue Image" onerror="this.src='../../../Images/staduim_icon.png'">
      </div>
      <div class="venue-info">
        <h3 class="venue-title">${group.group_name}</h3>
        <p class="venue-location">📍 ${group.location}</p>
        <div class="venue-tags">
          <span class="tag">${group.SportCategory}</span>
          <span class="player-count">
            ⭐ ${group.rating ? parseFloat(group.rating).toFixed(1) : "N/A"} |
            📍 ${group.distance ? group.distance.toFixed(2) + " km" : "Location blocked"}
          </span>
        </div>
        <div class="venue-footer">
          <span class="venue-price">${group.price === 'Free' ? 'Free' : '₪' + group.price}<span class="per">${group.price === 'Free' ? '' : '/person'}</span></span>
          <button class="join-btn" data-group='${groupDataEncoded}' onclick="handleJoinClick(this)">Join Group</button>
        </div>
      </div>
    `;

    container.appendChild(card);
  });
}

// ✅ Handle Join Button Click Safely
function handleJoinClick(button) {
  try {
    const groupData = JSON.parse(button.dataset.group.replace(/&apos;/g, "'"));
    joinGroup(groupData);
  } catch (e) {
    console.error("Failed to parse group data:", e);
  }
}

// ✅ Join Group
function joinGroup(group) {
  selectedGroup = group;

  if (group.privacy === 'private') {
    document.getElementById('accessCodeInput').value = '';
    document.getElementById('privateModal').style.display = 'block';
  } else {
    redirectToBooking(group.booking_id);
  }
}

// ✅ Validate Private Code
function validateAccessCode() {
  const enteredCode = document.getElementById('accessCodeInput').value.trim();

  if (!enteredCode) {
    alert("Please enter an access code.");
    return;
  }

  if (enteredCode === selectedGroup.group_password) {
    closeModal();
    redirectToBooking(selectedGroup.booking_id);
  } else {
    alert("The code you entered is not correct for this group.");
    document.getElementById('accessCodeInput').value = '';
    document.getElementById('accessCodeInput').focus();
  }
}

function closeModal() {
  document.getElementById('privateModal').style.display = 'none';
}

function redirectToBooking(booking_id) {
  const url = `../BookingDetails/BookingDetails.php?booking_id=${encodeURIComponent(booking_id)}`;
  window.location.href = url;
}

// 🌍 Location helpers
function getUserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported.");
      reject("No geolocation");
    } else {
      navigator.geolocation.getCurrentPosition(
        position => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        error => {
          alert("Please allow location access to sort by distance.");
          reject(error);
        }
      );
    }
  });
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  // Wait for Google Maps to load
  if (typeof google !== 'undefined' && google.maps && google.maps.geometry) {
    const point1 = new google.maps.LatLng(lat1, lon1);
    const point2 = new google.maps.LatLng(lat2, lon2);
    return google.maps.geometry.spherical.computeDistanceBetween(point1, point2) / 1000;
  } else {
    // Fallback to manual calculation if Google Maps not loaded
    function toRad(x) {
      return x * Math.PI / 180;
    }
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}

// ✅ Search
document.getElementById('playerSearch').addEventListener('input', function () {
  const query = this.value.trim().toLowerCase();
  const filtered = allGroups.filter(group =>
    group.group_name.toLowerCase().startsWith(query)
  );
  renderGroups(filtered);
});

// ✅ Sort
document.getElementById('price-low').addEventListener('change', () => {
  renderGroups([...allGroups].sort((a, b) => a.price - b.price));
});

document.getElementById('price-high').addEventListener('change', () => {
  renderGroups([...allGroups].sort((a, b) => b.price - a.price));
});

document.getElementById('only-public').addEventListener('change', () => {
  renderGroups(allGroups.filter(g => g.privacy === 'public'));
});

document.getElementById('only-private').addEventListener('change', () => {
  renderGroups(allGroups.filter(g => g.privacy === 'private'));
});

document.getElementById('all-groups').addEventListener('change', () => {
  renderGroups(allGroups);
});

document.getElementById('rating-low').addEventListener('change', () => {
  renderGroups([...allGroups].sort((a, b) => (a.rating || 0) - (b.rating || 0)));
});

document.getElementById('rating-high').addEventListener('change', () => {
  renderGroups([...allGroups].sort((a, b) => (b.rating || 0) - (a.rating || 0)));
});

document.getElementById('distance-near').addEventListener('change', () => {
  renderGroups([...allGroups].sort((a, b) => a.distance - b.distance));
});

document.getElementById('distance-far').addEventListener('change', () => {
  renderGroups([...allGroups].sort((a, b) => b.distance - a.distance));
});
