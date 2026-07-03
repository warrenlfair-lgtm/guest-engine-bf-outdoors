let properties = [];
let cleaningTasks = [];
let reservations = [];
let operationsReminders = [];

let editingPropertyId = null;
let selectedCleaningPropertyId = null;
let editingCleaningId = null;
let editingReminderPropertyId = null;
let editingReminderId = null;

let selectedPropertyFilter = "";
let selectedMonthFilter = "current";
let collapsedPropertyCards = new Set();
let weekViewMode = localStorage.getItem("guestReadyDefaultWeekView") || "calendar";

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
const alertDetailModal = document.getElementById("alertDetailModal");
const alertDetailBody = document.getElementById("alertDetailBody");
const closeAlertDetailBtn = document.getElementById("closeAlertDetailBtn");
const weekTasksContainer = document.getElementById("weekTasks");
const weekTasksCalendarContainer = document.getElementById("weekTasksCalendar");
const weekViewToggleButtons = Array.from(document.querySelectorAll(".week-view-btn"));
const debugTasksBtn = document.getElementById("debugTasksBtn");
const debugTaskCount = document.getElementById("debugTaskCount");
const propertyFilterSelect = document.getElementById("propertyFilterSelect");
const monthFilterSelect = document.getElementById("monthFilterSelect");
const weekViewDefaultCheckbox = document.getElementById("weekViewDefault");

addPropertyBtn.onclick = openAddModal;
cancelBtn.onclick = closePropertyModal;
savePropertyBtn.onclick = saveProperty;

cancelCleaningBtn.onclick = closeCleaningModal;
saveCleaningBtn.onclick = saveCleaningTask;

cancelReminderBtn.onclick = closeReminderModal;
saveReminderBtn.onclick = saveReminder;
closeAlertDetailBtn.onclick = closeAlertDetail;

const syncAllIcalBtn = document.getElementById("syncAllIcalBtn");
const syncAllStatus = document.getElementById("syncAllStatus");
if (syncAllIcalBtn) {
  syncAllIcalBtn.addEventListener("click", syncAllIcal);
}

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
    if (weekViewDefaultCheckbox.checked) {
      localStorage.setItem("guestReadyDefaultWeekView", weekViewMode);
    }
    weekViewToggleButtons.forEach(b => b.classList.remove("active"));
    button.classList.add("active");
    renderWeekView();
  });
});

if (debugTasksBtn) {
  debugTasksBtn.addEventListener("click", debugCleaningTasks);
}

initializeWeekViewMode();
loadData();

function initializeWeekViewMode() {
  const savedMode = localStorage.getItem("guestReadyDefaultWeekView") || "calendar";
  weekViewMode = savedMode;
  weekViewToggleButtons.forEach(button => {
    if (button.dataset.mode === weekViewMode) {
      button.classList.add("active");
    } else {
      button.classList.remove("active");
    }
  });
}

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
  standardDay.value = property.standard_service_day || "Wednesday";
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

function openAlertDetail(propertyName, turnoverDate, checkOutDate, checkInDate) {
  alertDetailBody.innerHTML = `
    <table class="alert-detail-table">
      <tr><th>Property</th><td>${propertyName}</td></tr>
      <tr><th>Alert Type</th><td>Same-Day Turnover</td></tr>
      <tr><th>Turnover Date</th><td>${turnoverDate}</td></tr>
      <tr><th>Check-Out</th><td>${checkOutDate}</td></tr>
      <tr><th>Check-In</th><td>${checkInDate}</td></tr>
      <tr><th>Reason</th><td>A guest checks out and another guest checks in on the same day.</td></tr>
      <tr><th>Recommended Action</th><td class="alert-detail-action">Guest Ready service must be completed on the turnover day.</td></tr>
    </table>
  `;
  alertDetailModal.classList.remove("hidden");
}

function closeAlertDetail() {
  alertDetailModal.classList.add("hidden");
  alertDetailBody.innerHTML = "";
}

function openReminderModal(propertyId) {
  editingReminderPropertyId = propertyId;
  editingReminderId = null;
  reminderTitle.value = "";
  reminderNotes.value = "";
  reminderDueDate.value = "";
  reminderModal.classList.remove("hidden");
}

function openEditReminder(reminderId) {
  const reminder = operationsReminders.find(r => r.id === reminderId);
  if (!reminder) return;

  editingReminderPropertyId = reminder.property_id;
  editingReminderId = reminderId;
  reminderTitle.value = reminder.title || "";
  reminderNotes.value = reminder.notes || "";
  reminderDueDate.value = reminder.due_date || "";
  reminderModal.classList.remove("hidden");
}

function closeReminderModal() {
  reminderModal.classList.add("hidden");
  editingReminderPropertyId = null;
  editingReminderId = null;
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

  const reminderData = {
    title: reminderTitle.value.trim(),
    notes: reminderNotes.value.trim() || null,
    due_date: reminderDueDate.value || formatDateValue(today),
  };

  let error;
  if (editingReminderId) {
    // Update existing reminder
    const result = await supabaseClient
      .from("operations_reminders")
      .update(reminderData)
      .eq("id", editingReminderId);
    error = result.error;
  } else {
    // Insert new reminder
    const reminder = {
      ...reminderData,
      property_id: editingReminderPropertyId,
      status: "Open",
      created_at: new Date().toISOString(),
      completed_at: null,
    };
    const result = await supabaseClient
      .from("operations_reminders")
      .insert([reminder]);
    error = result.error;
  }

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
  console.log("Querying reservations table...");
  console.log("[loadReservations] Table: reservations | Filters: none | Order: check_in ASC");

  const { data, error } = await supabaseClient
    .from("reservations")
    .select("*")
    .order("check_in", { ascending: true });

  console.log("Returned rows:", data?.length);
  console.log("Query result:", data);

  if (error) {
    console.error("[loadReservations] ERROR:", error.message, "| code:", error.code, "| hint:", error.hint);
    reservations = [];
    return;
  }

  reservations = data || [];
  console.log("[loadReservations] reservations[] set to", reservations.length, "rows");
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

async function syncAllIcal() {
  const allProperties = properties;
  const icalProperties = allProperties.filter(p => p.ical_url);

  if (icalProperties.length === 0) {
    syncAllStatus.textContent = "No properties with an iCal URL configured.";
    return;
  }

  syncAllIcalBtn.disabled = true;
  renderSyncReport(null); // clear previous report
  console.log(`[SyncAll] Starting sync for ${icalProperties.length} properties (${allProperties.length - icalProperties.length} skipped — no iCal URL)`);

  const results = [];

  // Mark skipped properties first
  for (const p of allProperties) {
    if (!p.ical_url) {
      console.log(`[SyncAll] SKIP "${p.property_name}" — no iCal URL`);
      results.push({ propertyName: p.property_name, skipped: true });
    }
  }

  for (let i = 0; i < icalProperties.length; i++) {
    const property = icalProperties[i];
    syncAllStatus.textContent = `Syncing ${i + 1} of ${icalProperties.length}: ${property.property_name}...`;
    console.log(`[SyncAll] (${i + 1}/${icalProperties.length}) Starting sync — "${property.property_name}" id:${property.id} ical_url:${property.ical_url}`);

    const result = { propertyName: property.property_name, skipped: false, started: true, success: false, error: null, data: null };

    try {
      const { data, error } = await supabaseClient.functions.invoke("sync-ical", {
        method: "POST",
        body: JSON.stringify({ property_id: property.id })
      });

      console.log(`[SyncAll] Edge Function response for "${property.property_name}":`, data, error);

      if (error) {
        result.error = error.message || String(error);
        console.log(`[SyncAll] ERROR for "${property.property_name}":`, result.error);
      } else {
        result.success = true;
        result.data = data;
        console.log(`[SyncAll] SUCCESS for "${property.property_name}": parsed=${data?.reservationsParsed ?? "?"} active=${data?.activeReservations ?? "?"} ignored=${data?.oldIgnored ?? "?"} saved=${data?.reservationsCreated ?? 0} weekly=${data?.weeklyTasksCreated ?? 0} guestReady=${data?.guestReadyTasksCreated ?? 0}`);
      }
    } catch (invokeError) {
      result.error = invokeError?.message || String(invokeError);
      console.log(`[SyncAll] EXCEPTION for "${property.property_name}":`, invokeError);
    }

    results.push(result);
  }

  console.log("[SyncAll] All properties processed. Refreshing data...");
  try {
    await loadData();
  } catch (loadError) {
    console.log("[SyncAll] loadData() threw after sync:", loadError);
  }

  const succeeded = results.filter(r => r.success).length;
  const failed = results.filter(r => r.started && !r.success).length;
  syncAllStatus.textContent = `Sync complete — ${succeeded} succeeded, ${failed} failed, ${results.filter(r => r.skipped).length} skipped. See report below.`;
  console.log("[SyncAll] Done.", syncAllStatus.textContent);

  renderSyncReport(results);
  syncAllIcalBtn.disabled = false;
}

function renderSyncReport(results) {
  const container = document.getElementById("syncReport");
  if (!container) return;

  if (!results) {
    container.innerHTML = "";
    return;
  }

  const rows = results.map(r => {
    if (r.skipped) {
      return `
        <tr class="sync-row-skipped">
          <td>${r.propertyName}</td>
          <td colspan="8" class="sync-skipped-label">Skipped — no iCal URL</td>
        </tr>`;
    }
    if (!r.success) {
      return `
        <tr class="sync-row-error">
          <td>${r.propertyName}</td>
          <td>✓</td>
          <td colspan="6">—</td>
          <td class="sync-error-msg">${r.error || "Unknown error"}</td>
        </tr>`;
    }
    const d = r.data || {};
    return `
      <tr class="sync-row-success">
        <td>${r.propertyName}</td>
        <td>✓</td>
        <td>${d.reservationsParsed ?? "—"}</td>
        <td>${d.activeReservations ?? "—"}</td>
        <td>${d.oldIgnored ?? "—"}</td>
        <td>${d.reservationsCreated ?? 0}</td>
        <td>${d.weeklyTasksCreated ?? 0}</td>
        <td>${d.guestReadyTasksCreated ?? 0}</td>
        <td class="sync-ok-label">OK</td>
      </tr>`;
  }).join("");

  container.innerHTML = `
    <div class="sync-report">
      <div class="sync-report-header">
        <strong>Sync Report</strong>
        <button class="sync-report-close" onclick="document.getElementById('syncReport').innerHTML=''">✕ Close</button>
      </div>
      <table class="sync-report-table">
        <thead>
          <tr>
            <th>Property</th>
            <th>Started</th>
            <th>Parsed</th>
            <th>Active</th>
            <th>Ignored</th>
            <th>Saved</th>
            <th>Weekly Tasks</th>
            <th>Guest Ready Tasks</th>
            <th>Result</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

async function syncPropertyIcal(propertyId) {
  console.log("[SynciCal] Sync button clicked, propertyId:", propertyId);

  const property = properties.find((p) => p.id === propertyId);
  if (!property || !property.ical_url) {
    const msg = "No iCal URL configured for this property.";
    console.log("[SynciCal] Aborted:", msg);
    statusMessage.textContent = msg;
    return;
  }

  console.log("[SynciCal] Syncing property:", property.property_name, "ical_url:", property.ical_url);
  statusMessage.textContent = `Syncing iCal for ${property.property_name}...`;

  let data;
  let error;
  try {
    ({ data, error } = await supabaseClient.functions.invoke("sync-ical", {
      method: "POST",
      body: JSON.stringify({ property_id: propertyId })
    }));
    console.log("[SynciCal] Edge Function response — data:", data, "error:", error);
  } catch (invokeError) {
    const msg = "iCal sync request failed: " + (invokeError?.message || invokeError);
    console.log("[SynciCal] Invoke threw exception:", invokeError);
    statusMessage.textContent = msg;
    return;
  }

  if (error) {
    const msg = "iCal sync failed: " + (error.message || error);
    console.log("[SynciCal] Edge Function returned error:", error);
    statusMessage.textContent = msg;
    return;
  }

  try {
    await loadData();
  } catch (loadError) {
    console.log("[SynciCal] loadData() threw after sync — suppressing to preserve result message:", loadError);
  }

  const successMsg = `iCal sync complete: ${data?.reservationsCreated ?? 0} reservation(s) saved, ${data?.tasksCreated ?? 0} Guest Ready task(s) created.`;
  console.log("[SynciCal] Success message:", successMsg);
  statusMessage.textContent = successMsg;
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

  // If a task's date is being changed, flag it as manually modified
  // so that future syncs do not overwrite it or recreate it on the original date.
  const isManuallyMoving = editingCleaningId && existingTask?.service_date !== serviceDate;

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
    completed_at: completedAt,
    ...(isManuallyMoving ? { manually_modified: true } : {})
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

async function backfillSourceKeys() {
  console.log("[Backfill] Starting source_key migration...");
  
  // Fetch all tasks without source_key
  const { data: tasksToUpdate, error: fetchError } = await supabaseClient
    .from("cleaning_tasks")
    .select("id, property_id, service_date, service_type, check_in_date")
    .is("source_key", null);

  if (fetchError || !tasksToUpdate?.length) {
    console.log("[Backfill] No tasks to backfill or error:", fetchError);
    return;
  }

  console.log(`[Backfill] Found ${tasksToUpdate.length} tasks without source_key`);

  const updates = tasksToUpdate.map(task => {
    let source_key = null;
    let source_type = null;

    if (task.service_type === "Guest Ready" && task.check_in_date) {
      source_key = `gr:${task.property_id}:${task.check_in_date}`;
      source_type = "reservation_guest_ready";
    } else if (task.service_type === "Weekly Standard") {
      source_key = `wk:${task.property_id}:${task.service_date}`;
      source_type = "weekly_standard";
    }

    return { id: task.id, source_key, source_type };
  });

  for (const update of updates) {
    if (!update.source_key) continue;
    const { error: updateError } = await supabaseClient
      .from("cleaning_tasks")
      .update({ source_key: update.source_key, source_type: update.source_type })
      .eq("id", update.id);
    if (updateError) {
      console.error(`[Backfill] Error updating task ${update.id}:`, updateError);
    }
  }

  console.log("[Backfill] Backfill complete. Run loadData() to refresh the view.");
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
  standardDay.value = "Wednesday";
  coverageDays.value = 2;
  offCycleCharge.value = 65;
}

function toggleInvoiceMarker(taskId) {
  const task = cleaningTasks.find(t => t.id === taskId);
  if (!task) return;
  
  const newInvoiced = !task.invoiced;
  
  // Optimistically update UI
  task.invoiced = newInvoiced;
  renderTaskViews();
  refreshBillingCard();
  
  // Update database
  supabaseClient
    .from("cleaning_tasks")
    .update({ invoiced: newInvoiced })
    .eq("id", taskId)
    .then(({ error }) => {
      if (error) {
        // Revert on error
        task.invoiced = !newInvoiced;
        renderTaskViews();
        refreshBillingCard();
        alert("Error updating invoice marker: " + error.message);
      } else {
        // Refresh billing card after successful update
        refreshBillingCard();
      }
    });
}

function refreshBillingCard() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  
  const monthStart = new Date(currentYear, currentMonth, 1);
  const monthEnd = new Date(currentYear, currentMonth + 1, 0);
  const monthStartString = formatDateValue(monthStart);
  const monthEndString = formatDateValue(monthEnd);
  
  let totalBillableAmount = 0;
  let invoicedAmount = 0;
  let totalBillableTaskCount = 0;
  let invoicedTaskCount = 0;
  
  cleaningTasks.forEach(task => {
    const taskDate = task.service_date;
    const isCurrentMonth = taskDate >= monthStartString && taskDate <= monthEndString;
    const taskBillingAmount = getTaskBillingAmount(task);
    const hasCharge = taskBillingAmount > 0;
    
    if (isCurrentMonth && hasCharge) {
      totalBillableAmount += taskBillingAmount;
      totalBillableTaskCount += 1;
      
      if (task.invoiced) {
        invoicedAmount += taskBillingAmount;
        invoicedTaskCount += 1;
      }
    }
  });
  
  // Update billing card display
  document.getElementById("invoicedAmount").textContent = invoicedAmount;
  document.getElementById("totalBillableAmount").textContent = totalBillableAmount;
  document.getElementById("invoicedTaskCount").textContent = invoicedTaskCount;
  document.getElementById("totalTaskCount").textContent = totalBillableTaskCount;
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
  const todayString = formatDateValue(today);

  console.log("[TodayView] Today date string:", todayString);

  const todayTasks = cleaningTasks.filter((task) => {
    if (!task.service_date) return false;
    return task.service_date === todayString;
  });

  console.log("[TodayView] Tasks matching today:", todayTasks.length, todayTasks.map(t => ({ id: t.id, service_date: t.service_date, service_type: t.service_type })));

  return todayTasks.sort((a, b) => a.service_date.localeCompare(b.service_date));
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

function getDayNameFromDateString(dateString) {
  if (!dateString) return null;
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return dayNames[parseDateString(dateString).getUTCDay()];
}

function getDayNumberFromName(dayName) {
  const days = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  };
  return days[dayName];
}

function getIncludedDaysForStandardDay(standardDay) {
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const standardDayNumber = getDayNumberFromName(standardDay);
  if (standardDayNumber === undefined) {
    return new Set(["Tuesday", "Wednesday", "Thursday"]);
  }

  const previousDay = dayNames[(standardDayNumber + 6) % 7];
  const nextDay = dayNames[(standardDayNumber + 1) % 7];
  return new Set([previousDay, standardDay, nextDay]);
}

function formatIncludedDaysLabel(includedDaysSet) {
  const orderedDayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return orderedDayNames.filter((day) => includedDaysSet.has(day)).join("/");
}

function isSameDayCheckInGuestReadyTask(task) {
  if (!isTaskGuestReady(task)) return false;
  if (!task.check_in_date) return false;
  const serviceDate = task.service_date || task.scheduled_date;
  return Boolean(serviceDate && serviceDate === task.check_in_date);
}

function getGuestReadyBillingDetails(task) {
  const serviceDate = task.service_date || task.scheduled_date;
  const serviceDay = getDayNameFromDateString(serviceDate);
  const property = properties.find((p) => p.id === task.property_id);
  const standardDay = property?.standard_service_day || "Wednesday";
  const includedDays = getIncludedDaysForStandardDay(standardDay);
  const isIncluded = Boolean(serviceDay && includedDays.has(serviceDay));

  if (isIncluded) {
    return {
      isIncluded: true,
      isChargeable: false,
      effectiveCharge: 0,
      serviceDay,
      standardDay,
      includedDaysLabel: formatIncludedDaysLabel(includedDays),
    };
  }

  const rawCharge = Number(task.charge || 0);
  const defaultCharge = Number(property?.default_off_cycle_charge ?? 65);

  return {
    isIncluded: false,
    isChargeable: true,
    effectiveCharge: rawCharge > 0 ? rawCharge : defaultCharge,
    serviceDay,
    standardDay,
    includedDaysLabel: formatIncludedDaysLabel(includedDays),
  };
}

function getTaskBillingAmount(task) {
  if (!isTaskGuestReady(task)) {
    return Number(task.charge || 0);
  }

  const billing = getGuestReadyBillingDetails(task);
  return billing.isChargeable ? billing.effectiveCharge : 0;
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
  const alertBadge = getAlertBadgeForTask(task);
  const invoiceMarkerClass = task.invoiced ? "invoice-marker-checked" : "invoice-marker-unchecked";

  return `
    <div class="${cardClass}">
      <div class="task-card-header">
        <div class="task-card-title">${getPropertyName(task.property_id)}</div>
        <label class="invoice-marker ${invoiceMarkerClass}">
          <input type="checkbox" ${task.invoiced ? "checked" : ""} onchange="toggleInvoiceMarker('${task.id}')" />
          <span>$</span>
        </label>
      </div>
      ${alertBadge}
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

function getGuestProtectionAlerts() {
  const alerts = [];
  const seenTurnovers = new Set();

  for (const checkOut of reservations) {
    if (!checkOut.check_out) continue;
    for (const checkIn of reservations) {
      if (checkIn.id === checkOut.id) continue;
      if (checkIn.property_id !== checkOut.property_id) continue;
      if (checkIn.check_in !== checkOut.check_out) continue;

      // Deduplicate by property + turnover date
      const key = `${checkIn.property_id}|${checkIn.check_in}`;
      if (seenTurnovers.has(key)) continue;
      seenTurnovers.add(key);

      const property = properties.find(p => p.id === checkIn.property_id);
      if (!property) continue;

      alerts.push({
        type: "turnover",
        status: "red",
        propertyName: property.property_name,
        turnoverDate: checkIn.check_in,
        checkOutDate: checkOut.check_out,
        checkInDate: checkIn.check_in,
      });
    }
  }

  return alerts;
}

function renderGuestProtectionAlerts() {
  const alerts = getGuestProtectionAlerts();

  if (alerts.length === 0) {
    guestProtectionAlertsContainer.innerHTML = "";
    return;
  }

  guestProtectionAlertsContainer.innerHTML = `
    <div class="guest-protection-summary summary-red">
      🚨 ${alerts.length} Same-Day Turnover Alert${alerts.length !== 1 ? "s" : ""} &mdash; check Week View for details.
    </div>
  `;
}

function getAlertBadgeForTask(task) {
  const alerts = getGuestProtectionAlerts();
  const property = properties.find(p => p.id === task.property_id);
  if (!property) return "";

  const pName = property.property_name.replace(/'/g, "\\'");

  const turnover = alerts.find(
    a => a.type === "turnover" &&
         a.propertyName === property.property_name &&
         a.turnoverDate === task.service_date
  );
  if (turnover) {
    return `<span class="task-alert-badge badge-alert-red" style="cursor:pointer"
      onclick="openAlertDetail('${pName}','${turnover.turnoverDate}','${turnover.checkOutDate}','${turnover.checkInDate}')">🚨 Same-Day Turnover</span>`;
  }

  return "";
}

function renderOperationsRemindersWidget() {
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
  console.log("[TodayView] Rendering", todayTasks.length, "today tasks");
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
                    const alertBadge = getAlertBadgeForTask(task);
                    const invoiceMarkerClass = task.invoiced ? "invoice-marker-checked" : "invoice-marker-unchecked";
                    
                    return `
                      <div class="calendar-task-card">
                        <div class="calendar-task-header">
                          <div class="calendar-task-property">${propertyName}</div>
                          <label class="invoice-marker ${invoiceMarkerClass}">
                            <input type="checkbox" ${task.invoiced ? "checked" : ""} onchange="toggleInvoiceMarker('${task.id}')" />
                            <span>$</span>
                          </label>
                        </div>
                        <div class="calendar-task-type">${task.service_type}</div>
                        ${badgesToShow}
                        ${alertBadge}
                        <div class="calendar-task-status">${task.status || 'Scheduled'}</div>
                        <div class="calendar-task-edit-section">
                          <button class="calendar-task-btn edit-btn" onclick="openEditCleaning('${task.id}')">Edit</button>
                        </div>
                        <div class="calendar-task-action-section">
                          ${task.status !== "Completed" ? `<button class="calendar-task-btn complete-btn" onclick="markCleaningComplete('${task.id}')">Complete</button>` : '<div class="calendar-task-btn-placeholder"></div>'}
                          <button class="calendar-task-btn delete-btn" onclick="if (confirm('Delete this task?')) { deleteCleaningTask('${task.id}'); }">Delete</button>
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

  // Calculate current month Off-Cycle charges
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  
  const monthStart = new Date(currentYear, currentMonth, 1);
  const monthEnd = new Date(currentYear, currentMonth + 1, 0);
  const monthStartString = formatDateValue(monthStart);
  const monthEndString = formatDateValue(monthEnd);
  
  // Update month label and refresh billing card
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const monthLabel = `${monthNames[currentMonth]} ${currentYear}`;
  document.getElementById("currentMonthLabel").textContent = monthLabel;
  
  refreshBillingCard();

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
    const hasSameDayGuestReady = tasks.some((task) => isSameDayCheckInGuestReadyTask(task));
    
    const isCollapsed = collapsedPropertyCards.has(property.id);
    const toggleButtonText = isCollapsed ? "Expand" : "Collapse";

    return `
      <div class="property-card">
        <div class="property-card-header">
          <div>
            <h3>${property.property_name}</h3>
            ${hasSameDayGuestReady ? `<span class="task-alert-badge badge-alert-red">🚨 Same-Day Check-In</span>` : ""}
          </div>
          <button class="collapse-btn" onclick="togglePropertyCardCollapse('${property.id}')">${toggleButtonText}</button>
        </div>

        <div class="property-meta">
          <div><strong>Address:</strong> ${property.address || "Not entered"}</div>
          <div><strong>Weekly Service:</strong> ${property.standard_service_day || "Wednesday"}</div>
          <div><strong>Coverage Rule:</strong> ${property.standard_service_day || "Wednesday"} +/- 1 day</div>
          <div><strong>Default Off-Cycle:</strong> $${property.default_off_cycle_charge || 65}</div>
          <div><strong>iCal:</strong> ${property.ical_url ? "Saved" : "Not entered"}</div>
        </div>

        <div class="card-actions">
          <button onclick="openCleaningModal('${property.id}')">+ Cleaning</button>
          <button onclick="openEditModal('${property.id}')">Edit</button>
          <button class="delete-btn" onclick="deleteProperty('${property.id}')">Delete</button>

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
                    <button onclick="openEditReminder('${reminder.id}')">Edit</button>
                    <button class="complete-reminder-btn" onclick="completeReminder('${reminder.id}')">✓ Complete</button>
                    <button class="delete-btn" onclick="deleteReminder('${reminder.id}')">Delete</button>
                  </div>
                </div>
              `;
            }).join("");
          })()}
        </div>

        <div class="task-list ${isCollapsed ? 'collapsed' : ''}">
          <h4>Scheduled Cleanings</h4>
          ${
            tasks.length === 0
              ? `<p>No cleanings scheduled.</p>`
              : tasks.map((task) => {
                  const taskBillingAmount = getTaskBillingAmount(task);
                  const guestReadyBilling = isTaskGuestReady(task) ? getGuestReadyBillingDetails(task) : null;
                  const invoiceMarkerClass = task.invoiced ? "invoice-marker-checked" : "invoice-marker-unchecked";
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

                  const billingLine = guestReadyBilling
                    ? guestReadyBilling.isIncluded
                      ? `<div class="task-line"><small>Billing: Included (${guestReadyBilling.serviceDay}; ${guestReadyBilling.standardDay} route window: ${guestReadyBilling.includedDaysLabel})</small></div>`
                      : `<div class="task-line"><small>Billing: Chargeable (${guestReadyBilling.serviceDay || "Outside route window"}; ${guestReadyBilling.standardDay} route window: ${guestReadyBilling.includedDaysLabel})</small></div>`
                    : "";

                  const sameDayBadge = isSameDayCheckInGuestReadyTask(task)
                    ? `<span class="task-alert-badge badge-alert-red">🚨 Same-Day Check-In</span>`
                    : "";

                  return `
                    <div class="${taskClass}">
                      <div class="task-item-header">
                        <div class="task-title">${task.service_date} — ${task.service_type}</div>
                        <label class="invoice-marker ${invoiceMarkerClass}">
                          <input type="checkbox" ${task.invoiced ? "checked" : ""} onchange="toggleInvoiceMarker('${task.id}')" />
                          <span>$ Reconcile</span>
                        </label>
                      </div>
                      ${badge}
                      ${sameDayBadge}
                      ${taskBillingAmount > 0 ? `<div class="task-line">$${taskBillingAmount}</div>` : ""}
                      ${billingLine}
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
      </div>
    `;
  }).join("");
}