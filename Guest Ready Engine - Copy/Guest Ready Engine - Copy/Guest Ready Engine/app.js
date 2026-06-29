let properties = [];
let cleaningTasks = [];
let reservations = [];
let operationsReminders = [];

let editingPropertyId = null;
let selectedCleaningPropertyId = null;
let editingCleaningId = null;
let editingReminderPropertyId = null;

let selectedPropertyFilter = "";
let selectedMonthFilter = "current";
let collapsedPropertyCards = new Set();
let weekViewMode = "list";

const addPropertyBtn = document.getElementById("addPropertyBtn");
const propertyModal = document.getElementById("propertyModal");
const cancelBtn = document.getElementById("cancelBtn");
const savePropertyBtn = document.getElementById("savePropertyBtn");
const propertyList = document.getElementById("propertyList");
const statusMessage = document.getElementById("statusMessage");

const cleaningModal = document.getElementById("cleaningModal");
const cancelCleaningBtn = document.getElementById("cancelCleaningBtn");
const saveCleaningBtn = document.getElementById("saveCleaningBtn");

const propertyName = document.getElementById("propertyName");
const propertyAddress = document.getElementById("propertyAddress");
const propertyIcal = document.getElementById("propertyIcal");
const standardDay = document.getElementById("standardDay");
const coverageDays = document.getElementById("coverageDays");
const offCycleCharge = document.getElementById("offCycleCharge");

const cleaningDate = document.getElementById("cleaningDate");
const cleaningServiceType = document.getElementById("cleaningServiceType");
const cleaningStatus = document.getElementById("cleaningStatus");
const cleaningTechnician = document.getElementById("cleaningTechnician");
const cleaningCharge = document.getElementById("cleaningCharge");
const cleaningNotes = document.getElementById("cleaningNotes");
const viewButtons = Array.from(document.querySelectorAll(".view-btn"));
const todayTasksContainer = document.getElementById("todayTasks");
const guestProtectionAlertsContainer = document.getElementById("guestProtectionAlerts");
const operationsRemindersWidget = document.getElementById("operationsRemindersWidget");
const reminderModal = document.getElementById("reminderModal");
const reminderTitle = document.getElementById("reminderTitle");
const reminderNotes = document.getElementById("reminderNotes");
const reminderDueDate = document.getElementById("reminderDueDate");
const cancelReminderBtn = document.getElementById("cancelReminderBtn");
const saveReminderBtn = document.getElementById("saveReminderBtn");
const weekTasksContainer = document.getElementById("weekTasks");
const weekTasksCalendarContainer = document.getElementById("weekTasksCalendar");
const weekViewToggleButtons = Array.from(document.querySelectorAll(".week-view-btn"));
const debugTasksBtn = document.getElementById("debugTasksBtn");
const debugTaskCount = document.getElementById("debugTaskCount");
const propertyFilterSelect = document.getElementById("propertyFilterSelect");
const monthFilterSelect = document.getElementById("monthFilterSelect");

addPropertyBtn.onclick = openAddModal;
cancelBtn.onclick = closePropertyModal;
savePropertyBtn.onclick = saveProperty;

cancelCleaningBtn.onclick = closeCleaningModal;
saveCleaningBtn.onclick = saveCleaningTask;

cancelReminderBtn.onclick = closeReminderModal;
saveReminderBtn.onclick = saveReminder;

Array.from(document.querySelectorAll(".quick-btn")).forEach((btn) => {
  btn.addEventListener("click", (e) => setReminderQuickDate(e.target.dataset.option));
});

viewButtons.forEach((button) => {
  button.addEventListener("click", () => showView(button.dataset.view));
});

propertyFilterSelect.addEventListener("change", (e) => {
  selectedPropertyFilter = e.target.value;
  renderProperties();
});

monthFilterSelect.addEventListener("change", (e) => {
  selectedMonthFilter = e.target.value;
  renderProperties();
});

weekViewToggleButtons.forEach((button) => {
  button.addEventListener("click", () => {
    weekViewMode = button.dataset.mode;
    weekViewToggleButtons.forEach(b => b.classList.remove("active"));
    button.classList.add("active");
    renderWeekView();
  });
});

if (debugTasksBtn) {
  debugTasksBtn.addEventListener("click", debugCleaningTasks);
}

loadData();

function showView(viewName) {
  document.querySelectorAll(".view-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === `${viewName}View`);
  });

  document.querySelectorAll(".view-btn").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === viewName);
  });
}

function openAddModal() {
  editingPropertyId = null;
  clearPropertyForm();
  propertyModal.classList.remove("hidden");
}

function openEditModal(id) {
  const property = properties.find(p => p.id === id);
  if (!property) return;

  editingPropertyId = id;

  propertyName.value = property.property_name || "";
  propertyAddress.value = property.address || "";
  propertyIcal.value = property.ical_url || "";
  standardDay.value = property.standard_service_day || "Thursday";
  coverageDays.value = property.coverage_days || 2;
  offCycleCharge.value = property.default_off_cycle_charge || 65;

  propertyModal.classList.remove("hidden");
}

function closePropertyModal() {
  propertyModal.classList.add("hidden");
}

function openCleaningModal(propertyId) {
  const property = properties.find(p => p.id === propertyId);
  if (!property) return;

  selectedCleaningPropertyId = propertyId;
  editingCleaningId = null;

  cleaningDate.value = new Date().toISOString().split("T")[0];
  cleaningServiceType.value = "Manual";
  cleaningStatus.value = "Scheduled";
  cleaningTechnician.value = "";
  cleaningCharge.value = 0;
  cleaningNotes.value = "";

  cleaningModal.classList.remove("hidden");
}

function openEditCleaning(taskId) {
  const task = cleaningTasks.find((t) => t.id === taskId);
  if (!task) return;

  editingCleaningId = task.id;
  selectedCleaningPropertyId = task.property_id;

  cleaningDate.value = task.scheduled_date || task.service_date || "";
  cleaningServiceType.value = task.service_type || "Manual";
  cleaningStatus.value = task.status || "Scheduled";
  cleaningTechnician.value = task.technician || "";
  cleaningCharge.value = task.charge || 0;
  cleaningNotes.value = task.notes || "";

  cleaningModal.classList.remove("hidden");
}

function closeCleaningModal() {
  cleaningModal.classList.add("hidden");
}

function openReminderModal(propertyId) {
  editingReminderPropertyId = propertyId;
  reminderTitle.value = "";
  reminderNotes.value = "";
  reminderDueDate.value = "";
  reminderModal.classList.remove("hidden");
}

function closeReminderModal() {
  reminderModal.classList.add("hidden");
  editingReminderPropertyId = null;
}

function setReminderQuickDate(option) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let dueDate = new Date(today);
  if (option === "7days") {
    dueDate.setDate(dueDate.getDate() + 7);
  } else if (option === "30days") {
    dueDate.setDate(dueDate.getDate() + 30);
  } else if (option === "next-visit") {
    // Next visit = next task scheduled for the property
    const propertyTasks = cleaningTasks.filter(t => t.property_id === editingReminderPropertyId && t.status !== "Cancelled");
    if (propertyTasks.length > 0) {
      const sortedTasks = propertyTasks.sort((a, b) => {
        return parseDateString(a.service_date).getTime() - parseDateString(b.service_date).getTime();
      });
      const nextTask = sortedTasks.find(t => parseDateString(t.service_date) >= today);
      if (nextTask) {
        dueDate = parseDateString(nextTask.service_date);
      }
    }
  }

  reminderDueDate.value = formatDateValue(dueDate);
}

async function saveReminder() {
  if (!editingReminderPropertyId) return;
  if (!reminderTitle.value.trim()) {
    alert("Please enter a reminder title.");
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const reminder = {
    property_id: editingReminderPropertyId,
    title: reminderTitle.value.trim(),
    notes: reminderNotes.value.trim() || null,
    due_date: reminderDueDate.value || formatDateValue(today),
    status: "Open",
    created_at: new Date().toISOString(),
    completed_at: null,
  };

  const { error } = await supabaseClient
    .from("operations_reminders")
    .insert([reminder]);

  if (error) {
    alert("Error saving reminder: " + error.message);
    return;
  }

  closeReminderModal();
  await loadOperationsReminders();
  renderProperties();
  renderOperationsRemindersWidget();
}

async function completeReminder(reminderId) {
  const { error } = await supabaseClient
    .from("operations_reminders")
    .update({ status: "Completed", completed_at: new Date().toISOString() })
    .eq("id", reminderId);

  if (error) {
    alert("Error completing reminder: " + error.message);
    return;
  }

  await loadOperationsReminders();
  renderProperties();
  renderOperationsRemindersWidget();
}

async function deleteReminder(reminderId) {
  if (!confirm("Delete this reminder?")) return;

  const { error } = await supabaseClient
    .from("operations_reminders")
    .delete()
    .eq("id", reminderId);

  if (error) {
    alert("Error deleting reminder: " + error.message);
    return;
  }

  await loadOperationsReminders();
  renderProperties();
  renderOperationsRemindersWidget();
}

async function loadData() {
  statusMessage.textContent = "Loading...";

  await loadProperties();
  await loadCleaningTasks();
  await loadReservations();
  await loadOperationsReminders();

  statusMessage.textContent = "";
  renderTaskViews();
  renderProperties();
  renderOperationsRemindersWidget();
}

async function loadProperties() {
  const { data, error } = await supabaseClient
    .from("properties")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    statusMessage.textContent = "Could not load properties: " + error.message;
    return;
  }

  properties = data || [];
}

async function loadCleaningTasks() {
  const { data, error } = await supabaseClient
    .from("cleaning_tasks")
    .select("*")
    .order("service_date", { ascending: true });

  if (error) {
    statusMessage.textContent = "Could not load cleanings: " + error.message;
    return;
  }

  cleaningTasks = data || [];
  console.log("All tasks returned from Supabase:", cleaningTasks);
}

async function debugCleaningTasks() {
  const { data, error } = await supabaseClient
    .from("cleaning_tasks")
    .select("*")
    .order("service_date", { ascending: true });

  console.log("ALL CLEANING TASKS:", data);
  console.log("ERROR:", error);

  if (debugTaskCount) {
    debugTaskCount.textContent = `Total tasks found: ${Array.isArray(data) ? data.length : 0}`;
  }

  if (weekTasksContainer) {
    weekTasksContainer.innerHTML = Array.isArray(data) && data.length
      ? `<div class="empty">Raw task count loaded. Check console for full payload.</div>`
      : `<div class="empty">No raw cleaning tasks returned.</div>`;
  }
}

async function loadReservations() {
  const { data, error } = await supabaseClient
    .from("reservations")
    .select("*")
    .order("check_in", { ascending: true });

  if (error) {
    reservations = [];
    return;
  }

  reservations = data || [];
}

async function loadOperationsReminders() {
  const { data, error } = await supabaseClient
    .from("operations_reminders")
    .select("*")
    .order("due_date", { ascending: true });

  if (error) {
    operationsReminders = [];
    return;
  }

  operationsReminders = data || [];
}

async function saveProperty() {
  const propertyData = {
    property_name: propertyName.value.trim(),
    address: propertyAddress.value.trim(),
    ical_url: propertyIcal.value.trim(),
    standard_service_day: standardDay.value,
    coverage_days: Number(coverageDays.value),
    default_off_cycle_charge: Number(offCycleCharge.value),
    active: true
  };

  if (!propertyData.property_name) {
    alert("Property name is required.");
    return;
  }

  let result;

  if (editingPropertyId) {
    result = await supabaseClient
      .from("properties")
      .update(propertyData)
      .eq("id", editingPropertyId);
  } else {
    result = await supabaseClient
      .from("properties")
      .insert([propertyData]);
  }

  if (result.error) {
    alert("Error saving property: " + result.error.message);
    return;
  }

  clearPropertyForm();
  closePropertyModal();
  loadData();
}

async function deleteProperty(id) {
  const property = properties.find(p => p.id === id);
  if (!property) return;

  const confirmed = confirm(`Delete ${property.property_name}?`);
  if (!confirmed) return;

  const { error } = await supabaseClient
    .from("properties")
    .delete()
    .eq("id", id);

  if (error) {
    alert("Error deleting property: " + error.message);
    return;
  }

  loadData();
}

async function syncPropertyIcal(propertyId) {
  const property = properties.find((p) => p.id === propertyId);
  if (!property || !property.ical_url) {
    statusMessage.textContent = "No iCal URL configured for this property.";
    return;
  }

  statusMessage.textContent = `Syncing iCal for ${property.property_name}...`;

  let data;
  let error;
  try {
    ({ data, error } = await supabaseClient.functions.invoke("sync-ical", {
      method: "POST",
      body: JSON.stringify({ property_id: propertyId })
    }));
  } catch (invokeError) {
    console.log("Sync iCal invoke error", invokeError);
    statusMessage.textContent = "iCal sync request failed: " + (invokeError?.message || invokeError);
    return;
  }

  if (error) {
    console.log("Sync iCal error", error);
    statusMessage.textContent = "iCal sync failed: " + (error.message || error);
    return;
  }

  await loadData();
  statusMessage.textContent = `iCal sync complete: ${data?.reservationsCreated ?? 0} reservation(s) saved, ${data?.tasksCreated ?? 0} Guest Ready task(s) created.`;
}

async function saveCleaningTask() {
  const property = properties.find((p) => p.id === selectedCleaningPropertyId);
  if (!property) return;

  const serviceDate = cleaningDate.value;
  const serviceType = cleaningServiceType.value;
  const taskStatus = cleaningStatus.value || "Scheduled";
  const charge = Number(cleaningCharge.value || 0);

  if (!serviceDate) {
    alert("Service date is required.");
    return;
  }

  const existingTask = editingCleaningId ? cleaningTasks.find((task) => task.id === editingCleaningId) : null;
  const completedAt = taskStatus === "Completed"
    ? existingTask?.completed_at || new Date().toISOString()
    : null;

  const task = {
    property_id: selectedCleaningPropertyId,
    service_date: serviceDate,
    scheduled_date: serviceDate,
    service_type: serviceType,
    technician: cleaningTechnician.value.trim(),
    status: taskStatus,
    off_cycle: charge > 0 || serviceType === "Off-Cycle",
    charge: charge,
    notes: cleaningNotes.value.trim(),
    guest_ready: serviceType === "Guest Ready",
    completed_at: completedAt
  };

  let result;

  if (editingCleaningId) {
    result = await supabaseClient
      .from("cleaning_tasks")
      .update(task)
      .eq("id", editingCleaningId);
  } else {
    result = await supabaseClient
      .from("cleaning_tasks")
      .insert([task]);
  }

  if (result.error) {
    alert("Error saving cleaning: " + result.error.message);
    return;
  }

  editingCleaningId = null;
  closeCleaningModal();
  await loadData();
}

async function deleteCleaningTask(id) {
  const confirmed = confirm("Delete this cleaning?");
  if (!confirmed) return;

  const { error } = await supabaseClient
    .from("cleaning_tasks")
    .delete()
    .eq("id", id);

  if (error) {
    alert("Error deleting cleaning: " + error.message);
    return;
  }

  loadData();
}

async function startCleaningTask(id) {
  const { error } = await supabaseClient
    .from("cleaning_tasks")
    .update({
      status: "In Progress"
    })
    .eq("id", id);

  if (error) {
    alert("Error starting cleaning: " + error.message);
    return;
  }

  loadData();
}

async function markCleaningComplete(id) {
  const { error } = await supabaseClient
    .from("cleaning_tasks")
    .update({
      status: "Completed",
      completed_at: new Date().toISOString()
    })
    .eq("id", id);

  if (error) {
    alert("Error completing cleaning: " + error.message);
    return;
  }

  loadData();
}

function clearPropertyForm() {
  propertyName.value = "";
  propertyAddress.value = "";
  propertyIcal.value = "";
  standardDay.value = "Thursday";
  coverageDays.value = 2;
  offCycleCharge.value = 65;
}

function getPropertyName(propertyId) {
  const property = properties.find((property) => property.id === propertyId);
  return property ? property.property_name : "Unknown Property";
}

function parseDateString(dateString) {
  const [year, month, day] = dateString.split("-").map((part) => Number(part));
  return new Date(Date.UTC(year, month - 1, day));
}

function formatDateValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeServiceDateValue(value) {
  if (!value) return null;

  if (value instanceof Date) {
    return value.toISOString();
  }

  const stringValue = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(stringValue)) {
    return stringValue;
  }

  const parsedDate = new Date(stringValue);
  if (!Number.isNaN(parsedDate.getTime())) {
    return parsedDate.toISOString();
  }

  return null;
}

function getMonthRange(monthType) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  let startDate, endDate;

  if (monthType === "current") {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  } else if (monthType === "next") {
    startDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    endDate = new Date(now.getFullYear(), now.getMonth() + 2, 0);
  } else if (monthType === "previous") {
    startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    endDate = new Date(now.getFullYear(), now.getMonth(), 0);
  } else {
    return null;
  }

  return {
    start: formatDateValue(startDate),
    end: formatDateValue(endDate)
  };
}

function taskMatchesDateFilter(task, monthType) {
  if (monthType === "all") return true;

  const range = getMonthRange(monthType);
  if (!range) return true;

  const taskDate = task.service_date || task.scheduled_date;
  if (!taskDate) return false;

  const taskDateStr = formatDateValue(parseDateString(taskDate));
  return taskDateStr >= range.start && taskDateStr <= range.end;
}

function togglePropertyCardCollapse(propertyId) {
  if (collapsedPropertyCards.has(propertyId)) {
    collapsedPropertyCards.delete(propertyId);
  } else {
    collapsedPropertyCards.add(propertyId);
  }
  renderProperties();
}

function getTodayCleaningTasks() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return cleaningTasks
    .filter((task) => {
      if (!task.service_date) return false;
      const taskDate = normalizeServiceDateValue(task.service_date);
      const todayValue = normalizeServiceDateValue(today.toISOString());
      return taskDate === todayValue;
    })
    .sort((a, b) => normalizeServiceDateValue(a.service_date).localeCompare(normalizeServiceDateValue(b.service_date)));
}

function getUpcomingCleaningTasks() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + 7);

  const todayString = formatDateValue(today);
  const endString = formatDateValue(endDate);

  console.log("Today's date string:", todayString);
  console.log("Seven-days-out date string:", endString);

  const filteredTasks = cleaningTasks
    .filter((task) => {
      if (!task.service_date) return false;

      const status = String(task.status || "").trim().toLowerCase();
      if (status === "cancelled") return false;

      const taskDate = normalizeServiceDateValue(task.service_date);
      if (!taskDate) return false;

      if (taskDate.length === 10 && todayString.length === 10 && endString.length === 10) {
        return taskDate >= todayString && taskDate <= endString;
      }

      return taskDate >= today.toISOString() && taskDate <= endDate.toISOString();
    })
    .sort((a, b) => normalizeServiceDateValue(a.service_date).localeCompare(normalizeServiceDateValue(b.service_date)));

  console.log("Filtered week tasks:", filteredTasks);
  return filteredTasks;
}

function isTaskGuestReady(task) {
  return Boolean(task.guest_ready || task.service_type === "Guest Ready");
}

function renderTaskCard(task) {
  const status = task.status || "Scheduled";
  const cardClass = task.status === "Completed"
    ? "task-card completed"
    : task.status === "In Progress"
      ? "task-card in-progress"
      : "task-card";
  const badgeClass = task.status === "Completed"
    ? "badge-green"
    : isTaskGuestReady(task)
      ? "badge-yellow"
      : "badge-blue";

  return `
    <div class="${cardClass}">
      <div class="task-card-title">${getPropertyName(task.property_id)}</div>
      <div class="task-card-details">
        <div><strong>Service Date:</strong> ${task.service_date || task.scheduled_date || "Not set"}</div>
        <div><strong>Task Type:</strong> ${task.service_type || "Manual"}</div>
        <div><strong>Guest Ready:</strong> ${isTaskGuestReady(task) ? "Yes" : "No"}</div>
        ${task.check_in_date ? `<div><strong>Check-In:</strong> ${task.check_in_date}</div>` : ""}
        <div><strong>Status:</strong> <span class="status-badge ${badgeClass}">${status}</span></div>
      </div>
      <div class="task-card-actions">
        <button onclick="openEditCleaning('${task.id}')">Edit</button>
        ${status !== "Completed" && status !== "In Progress" ? `<button onclick="startCleaningTask('${task.id}')">Start</button>` : ""}
        ${status !== "Completed" ? `<button onclick="markCleaningComplete('${task.id}')">Complete</button>` : ""}
      </div>
    </div>
  `;
}

function getGuestArrivalAlerts() {
  const alerts = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  const upcomingReservations = reservations.filter(res => {
    const checkInDate = parseDateString(res.check_in);
    const hoursUntilCheckIn = (checkInDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilCheckIn > 0 && hoursUntilCheckIn <= 72;
  });

  const processedReservationIds = new Set();

  for (const reservation of upcomingReservations) {
    if (processedReservationIds.has(reservation.id)) continue;
    processedReservationIds.add(reservation.id);

    const property = properties.find(p => p.id === reservation.property_id);
    if (!property) continue;

    const checkInDate = parseDateString(reservation.check_in);
    const checkInDateString = reservation.check_in;
    const hoursUntilCheckIn = (checkInDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Find completed services within 48 hours before check_in
    const serviceStartTime = new Date(checkInDate);
    serviceStartTime.setHours(serviceStartTime.getHours() - 48);
    const serviceStartString = formatDateValue(serviceStartTime);
    const serviceEndString = checkInDateString;

    const validServiceTypes = ["Weekly Standard", "Guest Ready", "Manual Service", "Hot Tub Service", "Pool Service"];
    const completedServices = cleaningTasks.filter(task => {
      return (
        task.property_id === reservation.property_id &&
        task.status === "Completed" &&
        validServiceTypes.includes(task.service_type) &&
        task.service_date &&
        task.service_date >= serviceStartString &&
        task.service_date <= serviceEndString
      );
    });

    const lastCompletedService = completedServices.length > 0
      ? completedServices.sort((a, b) => {
          const dateA = parseDateString(a.service_date).getTime();
          const dateB = parseDateString(b.service_date).getTime();
          return dateB - dateA;
        })[0]
      : null;

    // Find scheduled services before check_in
    const scheduledServices = cleaningTasks.filter(task => {
      return (
        task.property_id === reservation.property_id &&
        task.status !== "Completed" &&
        task.status !== "Cancelled" &&
        validServiceTypes.includes(task.service_type) &&
        task.service_date &&
        task.service_date < checkInDateString &&
        task.service_date >= formatDateValue(now)
      );
    });

    let alertStatus = "red";
    if (completedServices.length > 0) {
      alertStatus = "green";
    } else if (scheduledServices.length > 0) {
      alertStatus = "yellow";
    }

    alerts.push({
      id: `arrival-${reservation.id}`,
      type: "arrival",
      status: alertStatus,
      propertyName: property.property_name,
      checkInDate: checkInDateString,
      lastCompletedServiceDate: lastCompletedService?.service_date || null,
      hoursUntilCheckIn: Math.round(hoursUntilCheckIn),
    });
  }

  return alerts;
}

function getSameDayTurnoverAlerts() {
  const alerts = [];
  const processedPairs = new Set();

  for (const reservation of reservations) {
    const property = properties.find(p => p.id === reservation.property_id);
    if (!property) continue;

    const otherReservations = reservations.filter(res =>
      res.property_id === reservation.property_id &&
      res.id !== reservation.id &&
      res.check_out === reservation.check_in
    );

    for (const other of otherReservations) {
      const pairKey = `${other.id}-${reservation.id}`;
      const reversePairKey = `${reservation.id}-${other.id}`;

      if (processedPairs.has(pairKey) || processedPairs.has(reversePairKey)) continue;
      processedPairs.add(pairKey);

      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const turnoverDate = parseDateString(reservation.check_in);
      const daysUntilTurnover = (turnoverDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

      if (daysUntilTurnover >= -1 && daysUntilTurnover <= 7) {
        alerts.push({
          id: `turnover-${other.id}-${reservation.id}`,
          type: "turnover",
          status: "red",
          propertyName: property.property_name,
          turnoverDate: reservation.check_in,
          checkOutDate: other.check_out,
          checkInDate: reservation.check_in,
        });
      }
    }
  }

  return alerts;
}

function renderGuestProtectionAlerts() {
  const arrivalAlerts = getGuestArrivalAlerts();
  const turnoverAlerts = getSameDayTurnoverAlerts();
  const allAlerts = [...arrivalAlerts, ...turnoverAlerts];

  // Filter out green alerts if there are red or yellow ones (prioritize issues)
  let alertsToShow = allAlerts;
  const hasRedOrYellow = allAlerts.some(a => a.status === "red" || a.status === "yellow");
  if (hasRedOrYellow) {
    alertsToShow = allAlerts.filter(a => a.status === "red" || a.status === "yellow");
  }

  if (alertsToShow.length === 0) {
    guestProtectionAlertsContainer.innerHTML = "";
    return;
  }

  const alertsHTML = `
    <div class="guest-protection-section">
      <div class="alerts-header">🚨 Guest Protection Alerts</div>
      <div class="alerts-list">
        ${alertsToShow.map(alert => {
          if (alert.type === "arrival") {
            const statusClass = alert.status === "red" ? "alert-red" : "alert-yellow";
            return `
              <div class="alert-card ${statusClass}">
                <div class="alert-icon">🚨</div>
                <div class="alert-content">
                  <div class="alert-title">Guest Arrival Risk</div>
                  <div class="alert-property">${alert.propertyName}</div>
                  <div class="alert-date">Check-in: ${alert.checkInDate}</div>
                  ${alert.lastCompletedServiceDate ? `<div class="alert-service">Last service: ${alert.lastCompletedServiceDate}</div>` : `<div class="alert-service">No completed service yet</div>`}
                  <div class="alert-message">No completed service within 48 hours of guest arrival.</div>
                </div>
              </div>
            `;
          } else if (alert.type === "turnover") {
            return `
              <div class="alert-card alert-red">
                <div class="alert-icon">🚨</div>
                <div class="alert-content">
                  <div class="alert-title">Same-Day Turnover</div>
                  <div class="alert-property">${alert.propertyName}</div>
                  <div class="alert-date">Turnover: ${alert.turnoverDate}</div>
                  <div class="alert-message">Guest Ready service required today.</div>
                </div>
              </div>
            `;
          }
          return "";
        }).join("")}
      </div>
    </div>
  `;

  guestProtectionAlertsContainer.innerHTML = alertsHTML;
}

function renderOperationsRemindersWidget() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const openReminders = operationsReminders.filter(r => r.status === "Open");
  
  if (openReminders.length === 0) {
    operationsRemindersWidget.innerHTML = "";
    return;
  }

  // Categorize reminders
  const overdue = openReminders.filter(r => {
    const dueDate = parseDateString(r.due_date);
    return dueDate < today;
  });

  const dueSoon = openReminders.filter(r => {
    const dueDate = parseDateString(r.due_date);
    const daysUntilDue = (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    return daysUntilDue >= 0 && daysUntilDue <= 3;
  });

  const remindersToShow = [...overdue, ...dueSoon];

  if (remindersToShow.length === 0) {
    operationsRemindersWidget.innerHTML = "";
    return;
  }

  const widgetHTML = `
    <div class="operations-reminders-widget">
      <div class="widget-header">
        ${overdue.length > 0 ? `<div class="widget-alert">⚠️ ${overdue.length} Overdue Reminder${overdue.length !== 1 ? "s" : ""}</div>` : ""}
        ${dueSoon.length > 0 ? `<div class="widget-alert-secondary">📋 ${dueSoon.length} Due Soon</div>` : ""}
      </div>
      <div class="widget-reminders">
        ${remindersToShow.map(reminder => {
          const property = properties.find(p => p.id === reminder.property_id);
          const dueDate = parseDateString(reminder.due_date);
          const isOverdue = dueDate < today;
          const reminderClass = isOverdue ? "widget-reminder overdue" : "widget-reminder due-soon";
          
          return `
            <div class="${reminderClass}">
              <div class="widget-reminder-property">${property?.property_name || "Unknown"}</div>
              <div class="widget-reminder-title">${reminder.title}</div>
              <div class="widget-reminder-date">Due: ${reminder.due_date}${isOverdue ? " (OVERDUE)" : ""}</div>
              ${reminder.notes ? `<div class="widget-reminder-notes">${reminder.notes}</div>` : ""}
              <button class="complete-reminder-btn-small" onclick="completeReminder('${reminder.id}')">✓ Complete</button>
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;

  operationsRemindersWidget.innerHTML = widgetHTML;
}

function renderTaskViews() {
  renderGuestProtectionAlerts();
  
  const todayTasks = getTodayCleaningTasks();
  todayTasksContainer.innerHTML = todayTasks.length
    ? todayTasks.map(renderTaskCard).join("")
    : `<div class="empty">No cleaning tasks due today.</div>`;

  renderWeekView();
}

function renderWeekView() {
  const weekTasks = getUpcomingCleaningTasks();
  
  if (!weekTasks.length) {
    weekTasksContainer.innerHTML = `<div class="empty">No cleaning tasks scheduled in the next 7 days.</div>`;
    weekTasksCalendarContainer.innerHTML = `<div class="empty">No cleaning tasks scheduled in the next 7 days.</div>`;
    weekTasksContainer.classList.remove("hidden");
    weekTasksCalendarContainer.classList.add("hidden");
    return;
  }

  if (weekViewMode === "calendar") {
    weekTasksContainer.classList.add("hidden");
    weekTasksCalendarContainer.classList.remove("hidden");
    renderWeekViewCalendar(weekTasks);
  } else {
    weekTasksContainer.classList.remove("hidden");
    weekTasksCalendarContainer.classList.add("hidden");
    renderWeekViewList(weekTasks);
  }
}

function renderWeekViewList(weekTasks) {
  const grouped = weekTasks.reduce((acc, task) => {
    const date = task.service_date;
    acc[date] = acc[date] || [];
    acc[date].push(task);
    return acc;
  }, {});

  weekTasksContainer.innerHTML = Object.keys(grouped)
    .sort((a, b) => parseDateString(a).getTime() - parseDateString(b).getTime())
    .map((date) => `
      <div class="week-group">
        <h3>${date}</h3>
        ${grouped[date].map(renderTaskCard).join("")}
      </div>
    `)
    .join("");
}

function renderWeekViewCalendar(weekTasks) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayString = formatDateValue(today);

  // Create 7-day calendar
  const dayColumns = [];
  for (let i = 0; i < 7; i++) {
    const columnDate = new Date(today);
    columnDate.setDate(columnDate.getDate() + i);
    dayColumns.push(columnDate);
  }

  // Group tasks by date
  const tasksByDate = {};
  weekTasks.forEach(task => {
    if (!tasksByDate[task.service_date]) {
      tasksByDate[task.service_date] = [];
    }
    tasksByDate[task.service_date].push(task);
  });

  // Build calendar HTML
  const calendarHTML = `
    <div class="week-calendar">
      ${dayColumns.map(date => {
        const dateString = formatDateValue(date);
        const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][date.getDay()];
        const dayTasks = tasksByDate[dateString] || [];
        const isToday = dateString === todayString;
        
        return `
          <div class="calendar-day-column ${isToday ? 'today' : ''}">
            <div class="calendar-day-header">
              <div class="calendar-day-name">${dayName}</div>
              <div class="calendar-day-date">${dateString}</div>
              <div class="calendar-task-count">${dayTasks.length} task${dayTasks.length !== 1 ? 's' : ''}</div>
            </div>
            <div class="calendar-day-tasks">
              ${dayTasks.length === 0
                ? `<p class="no-tasks">No tasks</p>`
                : dayTasks.map(task => {
                    const propertyName = properties.find(p => p.id === task.property_id)?.property_name || 'Unknown';
                    const guestReadyBadge = task.guest_ready ? `<span class="status-badge badge-yellow">GUEST READY</span>` : '';
                    const completedBadge = task.status === "Completed" ? `<span class="status-badge badge-green">COMPLETED</span>` : '';
                    const badgesToShow = guestReadyBadge || completedBadge || `<span class="status-badge badge-blue">${task.status || 'Scheduled'}</span>`;
                    
                    return `
                      <div class="calendar-task-card">
                        <div class="calendar-task-property">${propertyName}</div>
                        <div class="calendar-task-type">${task.service_type}</div>
                        ${badgesToShow}
                        <div class="calendar-task-status">${task.status || 'Scheduled'}</div>
                        <div class="calendar-task-buttons">
                          <button class="calendar-task-btn edit-btn" onclick="openEditCleaning('${task.id}')">Edit</button>
                          ${task.status !== "Completed" ? `<button class="calendar-task-btn complete-btn" onclick="markCleaningComplete('${task.id}')">Complete</button>` : ''}
                        </div>
                      </div>
                    `;
                  }).join('')
              }
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  weekTasksCalendarContainer.innerHTML = calendarHTML;
}

function renderProperties() {
  document.getElementById("propertyCount").textContent = properties.length;

  const total = cleaningTasks.reduce((sum, task) => {
    return sum + Number(task.charge || 0);
  }, 0);

  document.getElementById("monthlyOffCycle").textContent = total;

  // Update property filter dropdown
  const propertyOptions = propertyFilterSelect.innerHTML;
  const newOptions = `<option value="">All Properties</option>${properties.map(p => `<option value="${p.id}">${p.property_name}</option>`).join("")}`;
  if (propertyOptions !== newOptions) {
    propertyFilterSelect.innerHTML = newOptions;
    propertyFilterSelect.value = selectedPropertyFilter;
  }

  // Filter properties based on selected filter
  let filteredProperties = properties;
  if (selectedPropertyFilter) {
    filteredProperties = properties.filter(p => p.id === selectedPropertyFilter);
  }

  if (filteredProperties.length === 0) {
    propertyList.innerHTML = `<div class="empty">No properties yet.</div>`;
    return;
  }

  propertyList.innerHTML = filteredProperties.map(property => {
    let tasks = cleaningTasks.filter(task => task.property_id === property.id);
    
    // Apply month filter to tasks
    tasks = tasks.filter(task => taskMatchesDateFilter(task, selectedMonthFilter));
    
    const isCollapsed = collapsedPropertyCards.has(property.id);
    const toggleButtonText = isCollapsed ? "Expand" : "Collapse";

    return `
      <div class="property-card">
        <div class="property-card-header">
          <h3>${property.property_name}</h3>
          <button class="collapse-btn" onclick="togglePropertyCardCollapse('${property.id}')">${toggleButtonText}</button>
        </div>

        <div class="property-meta">
          <div><strong>Address:</strong> ${property.address || "Not entered"}</div>
          <div><strong>Weekly Service:</strong> ${property.standard_service_day || "Thursday"}</div>
          <div><strong>Coverage Rule:</strong> ${property.standard_service_day || "Thursday"} + next day</div>
          <div><strong>Default Off-Cycle:</strong> $${property.default_off_cycle_charge || 65}</div>
          <div><strong>iCal:</strong> ${property.ical_url ? "Saved" : "Not entered"}</div>
        </div>

        <div class="card-actions">
          <button onclick="openCleaningModal('${property.id}')">+ Cleaning</button>
          <button onclick="openEditModal('${property.id}')">Edit</button>
          <button class="delete-btn" onclick="deleteProperty('${property.id}')">Delete</button>
          ${property.ical_url ? `<button onclick="syncPropertyIcal('${property.id}')">Sync iCal</button>` : ""}
        </div>

        <div class="task-list ${isCollapsed ? 'collapsed' : ''}">
          <h4>Scheduled Cleanings</h4>
          ${
            tasks.length === 0
              ? `<p>No cleanings scheduled.</p>`
              : tasks.map((task) => {
                  const taskClass =
                    task.status === "Completed"
                      ? "task-item completed"
                      : task.guest_ready
                      ? "task-item guestready"
                      : task.off_cycle
                      ? "task-item offcycle"
                      : "task-item";

                  const badge =
                    task.status === "Completed"
                      ? `<span class="status-badge badge-green">COMPLETED</span>`
                      : task.guest_ready
                      ? `<span class="status-badge badge-yellow">GUEST READY</span>`
                      : task.off_cycle
                      ? `<span class="status-badge badge-purple">OFF CYCLE</span>`
                      : `<span class="status-badge badge-blue">SCHEDULED</span>`;

                  return `
                    <div class="${taskClass}">
                      <div class="task-title">${task.service_date} — ${task.service_type}</div>
                      ${badge}
                      ${task.charge > 0 ? `<div class="task-line">$${task.charge}</div>` : ""}
                      <div class="task-line"><small>Status: ${task.status}</small></div>
                      ${task.completed_at ? `<div class="task-line"><small>Completed: ${new Date(task.completed_at).toLocaleString()}</small></div>` : ""}
                      ${task.check_in_date ? `<div class="task-line"><small>Prior to check-in: ${task.check_in_date}</small></div>` : ""}
                      ${task.notes ? `<div class="task-line"><small>Notes: ${task.notes}</small></div>` : ""}
                      <div class="task-buttons">
                        <button onclick="openEditCleaning('${task.id}')">Edit</button>
                        ${task.status !== "Completed" ? `<button onclick="markCleaningComplete('${task.id}')">Complete</button>` : ""}
                        <button class="delete-btn" onclick="deleteCleaningTask('${task.id}')">Delete</button>
                      </div>
                    </div>
                  `;
                }).join("")
          }
        </div>

        <div class="reminders-section">
          <div class="reminders-header">
            <h4>Operations Reminders</h4>
            <button class="add-reminder-btn" onclick="openReminderModal('${property.id}')">+ Reminder</button>
          </div>
          ${(() => {
            const propertyReminders = operationsReminders.filter(r => r.property_id === property.id && r.status === "Open");
            if (propertyReminders.length === 0) {
              return `<p class="no-reminders">No open reminders.</p>`;
            }
            return propertyReminders.map(reminder => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const dueDate = parseDateString(reminder.due_date);
              const isOverdue = dueDate < today;
              const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              const reminderClass = isOverdue ? "reminder-item overdue" : daysUntilDue <= 3 ? "reminder-item urgent" : "reminder-item";
              
              return `
                <div class="${reminderClass}">
                  <div class="reminder-title">${reminder.title}</div>
                  ${reminder.notes ? `<div class="reminder-notes">${reminder.notes}</div>` : ""}
                  <div class="reminder-due">Due: ${reminder.due_date}${isOverdue ? " (OVERDUE)" : daysUntilDue === 0 ? " (TODAY)" : ""}</div>
                  <div class="reminder-buttons">
                    <button class="complete-reminder-btn" onclick="completeReminder('${reminder.id}')">✓ Complete</button>
                    <button class="delete-btn" onclick="deleteReminder('${reminder.id}')">Delete</button>
                  </div>
                </div>
              `;
            }).join("");
          })()}
        </div>
      </div>
    `;
  }).join("");
}