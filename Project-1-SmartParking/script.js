
const API = "http://localhost:3001";

// ── Mobile menu ──────────────────────────────────────────────
document.getElementById("menuToggle").addEventListener("click", () => {
  document.querySelector(".nav-links").classList.toggle("open");
});

// ── Cancel modal state ───────────────────────────────────────
let pendingCancelSlot = null;

document.getElementById("cancelNo").addEventListener("click", closeModal);
document.getElementById("cancelYes").addEventListener("click", async () => {
  if (!pendingCancelSlot) return;
  closeModal();
  await cancelSlot(pendingCancelSlot);
});

function openModal(slotId) {
  pendingCancelSlot = slotId;
  document.getElementById("modalSlotId").textContent = slotId;
  document.getElementById("cancelModal").classList.remove("hidden");
}
function closeModal() {
  document.getElementById("cancelModal").classList.add("hidden");
  pendingCancelSlot = null;
}

// ── Booking form ─────────────────────────────────────────────
document.getElementById("reserveBtn").addEventListener("click", async () => {
  const name    = document.getElementById("name").value.trim();
  const vehicle = document.getElementById("vehicle").value.trim();
  const type    = document.getElementById("type").value;

  if (!name || !vehicle || !type) {
    showMsg("Please fill in all fields before reserving.", "error");
    return;
  }

  setReserveLoading(true);

  try {
    const res = await fetch(`${API}/book`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, vehicle, type }),
    });
    const data = await res.json();

    if (res.ok) {
      showMsg(`✔ Slot ${data.slot} reserved for ${name} — ${vehicle}`, "success");
      document.getElementById("name").value    = "";
      document.getElementById("vehicle").value = "";
      document.getElementById("type").value    = "";
      await loadSlots();
    } else {
      showMsg(data.message || "Booking failed. Try again.", "error");
    }
  } catch {
    showMsg("Cannot reach the server. Is the backend running?", "error");
  } finally {
    setReserveLoading(false);
  }
});

function setReserveLoading(on) {
  const btn = document.getElementById("reserveBtn");
  btn.textContent = on ? "Reserving…" : "Reserve Slot";
  btn.disabled    = on;
}

function showMsg(text, type) {
  const el = document.getElementById("bookingMsg");
  el.textContent  = text;
  el.className    = `booking-msg ${type}`;
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 5000);
}

// ── Cancel a slot via API ────────────────────────────────────
async function cancelSlot(slotId) {
  try {
    const res  = await fetch(`${API}/cancel/${slotId}`, { method: "PATCH" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    await loadSlots();
  } catch (err) {
    alert("Cancel failed: " + err.message);
  }
}

// ── Load and render slots ─────────────────────────────────────
async function loadSlots() {
  try {
    const res   = await fetch(`${API}/slots`);
    const slots = await res.json();
    renderSlots(slots);
    updateStats(slots);
  } catch {
    document.getElementById("slotContainer").innerHTML =
      `<p style="color:var(--muted);font-size:14px;">⚠ Could not connect to backend.</p>`;
  }
}

function renderSlots(slots) {
  const container = document.getElementById("slotContainer");
  container.innerHTML = "";

  slots.forEach(slot => {
    const div = document.createElement("div");
    div.className = `slot ${slot.status}`;

    div.innerHTML = `
      <div class="slot-id">${slot.id}</div>
      <div class="slot-status">${slot.status}</div>
      ${slot.status === "occupied"
        ? `<button class="cancel-btn" data-id="${slot.id}">Cancel</button>`
        : ""}
    `;

    if (slot.status === "occupied") {
      div.querySelector(".cancel-btn").addEventListener("click", () => openModal(slot.id));
    }

    container.appendChild(div);
  });
}

// ── Stats + occupancy bar ────────────────────────────────────
function updateStats(slots) {
  const total     = slots.length;
  const occupied  = slots.filter(s => s.status === "occupied").length;
  const available = total - occupied;

  animateTo("statTotal",     total);
  animateTo("statOccupied",  occupied);
  animateTo("statAvailable", available);

  const pct = total > 0 ? Math.round((occupied / total) * 100) : 0;
  document.getElementById("occupancyBar").style.width = `${pct}%`;
  document.getElementById("occupancyLabel").textContent =
    `${pct}% occupancy — ${occupied} of ${total} slots filled`;

  document.getElementById("heroAvailable").textContent = available;
}

function animateTo(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  let current = 0;
  const step = Math.ceil(target / 30);
  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = current;
    if (current >= target) clearInterval(timer);
  }, 30);
}

// ── Init ─────────────────────────────────────────────────────
loadSlots();

setInterval(loadSlots, 10000);
