// cleanings.js

let selectedCleaningPropertyId = null;
let editingCleaningId = null;

function openCleaningModal(propertyId) {

    selectedCleaningPropertyId = propertyId;
    editingCleaningId = null;

    cleaningDate.value = new Date().toISOString().split("T")[0];
    cleaningServiceType.value = "Manual";
    cleaningTechnician.value = "";
    cleaningCharge.value = 0;
    cleaningNotes.value = "";

    cleaningModal.classList.remove("hidden");
}

function openEditCleaning(taskId) {

    const task = cleaningTasks.find(t => t.id === taskId);

    if (!task) return;

    editingCleaningId = task.id;
    selectedCleaningPropertyId = task.property_id;

    cleaningDate.value = task.scheduled_date || task.service_date;
    cleaningServiceType.value = task.service_type;
    cleaningTechnician.value = task.technician || "";
    cleaningCharge.value = task.charge || 0;
    cleaningNotes.value = task.notes || "";

    cleaningModal.classList.remove("hidden");

}

function closeCleaningModal() {

    cleaningModal.classList.add("hidden");

}

async function loadCleaningTasks() {

    const { data, error } = await supabaseClient
        .from("cleaning_tasks")
        .select("*")
        .order("service_date");

    if (error) {

        console.error(error);
        return;

    }

    cleaningTasks = data || [];

}

async function saveCleaningTask() {

    const task = {

        property_id: selectedCleaningPropertyId,

        service_date: cleaningDate.value,
        scheduled_date: cleaningDate.value,

        service_type: cleaningServiceType.value,

        technician: cleaningTechnician.value,

        status: "Scheduled",

        guest_ready: cleaningServiceType.value === "Guest Ready",

        off_cycle: Number(cleaningCharge.value) > 0,

        charge: Number(cleaningCharge.value),

        notes: cleaningNotes.value

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

        alert(result.error.message);
        return;

    }

    editingCleaningId = null;

    closeCleaningModal();

    await loadData();

}

async function deleteCleaningTask(id) {

    if (!confirm("Delete cleaning?")) return;

    await supabaseClient
        .from("cleaning_tasks")
        .delete()
        .eq("id", id);

    await loadData();

}

async function markCleaningComplete(id) {

    await supabaseClient
        .from("cleaning_tasks")
        .update({

            status: "Completed",

            completed_at: new Date().toISOString()

        })
        .eq("id", id);

    await loadData();

}