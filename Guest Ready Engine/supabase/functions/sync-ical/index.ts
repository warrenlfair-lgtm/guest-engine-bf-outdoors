import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.");
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    fetch: globalThis.fetch,
  },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function createSuccessResponse(reservationsCreated = 0, tasksCreated = 0) {
  return new Response(JSON.stringify({
    success: true,
    reservationsCreated,
    tasksCreated,
  }), {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function parseICalReservations(icalText: string) {
  const unfolded = icalText.replace(/\r?\n[ \t]/g, "");
  const events = unfolded.split(/BEGIN:VEVENT/i).slice(1);
  const reservations: Array<{ check_in: string; check_out: string | null; summary: string | null }> = [];

  for (const eventText of events) {
    const checkInMatch = eventText.match(/DTSTART(?:;VALUE=DATE)?:(\d{8})(?:T\d{6}Z?)?/i);
    if (!checkInMatch) continue;

    const checkOutMatch = eventText.match(/DTEND(?:;VALUE=DATE)?:(\d{8})(?:T\d{6}Z?)?/i);
    const summaryMatch = eventText.match(/SUMMARY:(.*)/i);

    const check_in = `${checkInMatch[1].slice(0, 4)}-${checkInMatch[1].slice(4, 6)}-${checkInMatch[1].slice(6, 8)}`;
    const check_out = checkOutMatch
      ? `${checkOutMatch[1].slice(0, 4)}-${checkOutMatch[1].slice(4, 6)}-${checkOutMatch[1].slice(6, 8)}`
      : null;
    const summary = summaryMatch ? summaryMatch[1].trim() : null;
    reservations.push({ check_in, check_out, summary });
  }

  return reservations;
}

function parseDateString(dateString: string) {
  const [year, month, day] = dateString.split("-").map((part) => Number(part));
  return new Date(Date.UTC(year, month - 1, day));
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(dateString: string, daysToAdd: number) {
  const date = parseDateString(dateString);
  date.setUTCDate(date.getUTCDate() + daysToAdd);
  return formatDate(date);
}

function getDayNumber(dayName: string) {
  const days: Record<string, number> = {
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

function getDayName(dateString: string) {
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const date = parseDateString(dateString);
  return dayNames[date.getUTCDay()];
}

function getServiceDateForWeek(checkInDateString: string, standardDay: string) {
  const checkInDate = parseDateString(checkInDateString);
  const standardDayNumber = getDayNumber(standardDay);
  if (standardDayNumber === undefined) {
    return checkInDateString;
  }

  const checkInDayNumber = checkInDate.getUTCDay();
  const startOfWeek = new Date(checkInDate);
  startOfWeek.setUTCDate(checkInDate.getUTCDate() - checkInDayNumber);

  const serviceDate = new Date(startOfWeek);
  serviceDate.setUTCDate(startOfWeek.getUTCDate() + standardDayNumber);
  return formatDate(serviceDate);
}

function isCheckInCoveredByStandardDay(checkInDate: string, standardDay: string) {
  const checkInDayNumber = getDayNumber(getDayName(checkInDate));
  const standardDayNumber = getDayNumber(standardDay);
  if (standardDayNumber === undefined || checkInDayNumber === undefined) {
    return false;
  }

  const nextDayNumber = (standardDayNumber + 1) % 7;
  return checkInDayNumber === standardDayNumber || checkInDayNumber === nextDayNumber;
}

function getGuestReadyServiceDate(reservation: { check_in: string; check_out: string | null }, activeReservations: Array<{ check_in: string; check_out: string | null }>) {
  const hasSameDayTurnover = activeReservations.some((candidate) => {
    return candidate.check_in && candidate.check_in !== reservation.check_in && candidate.check_out === reservation.check_in;
  });

  return hasSameDayTurnover ? reservation.check_in : addDays(reservation.check_in, -1);
}

Deno.serve(async (req) => {
  let reservationsCreated = 0;
  let tasksCreated = 0;

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    if (req.method !== "POST") {
      return createSuccessResponse(reservationsCreated, tasksCreated);
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return createSuccessResponse(reservationsCreated, tasksCreated);
    }

    const propertyId = body?.property_id;
    if (!propertyId) {
      return createSuccessResponse(reservationsCreated, tasksCreated);
    }

    const { data: properties, error: propertyError } = await supabase
      .from("properties")
      .select("*")
      .eq("id", propertyId)
      .limit(1)
      .single();

    if (propertyError || !properties) {
      return createSuccessResponse(reservationsCreated, tasksCreated);
    }

    const property = properties as { id: string; ical_url: string | null; default_off_cycle_charge: number | null; standard_service_day: string | null };
    console.log("STEP 1 property loaded");
    if (!property.ical_url) {
      return createSuccessResponse(reservationsCreated, tasksCreated);
    }

    let icalText: string;
    try {
      const response = await fetch(property.ical_url);
      if (!response.ok) {
        return createSuccessResponse(reservationsCreated, tasksCreated);
      }
      icalText = await response.text();
    } catch {
      return createSuccessResponse(reservationsCreated, tasksCreated);
    }

    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const cutoff = new Date(currentMonthStart);
    cutoff.setDate(cutoff.getDate() - 30);
    const cutoffDate = cutoff.toISOString().split("T")[0];

    const { error: cleanupCleaningError } = await supabase
      .from("cleaning_tasks")
      .delete()
      .eq("property_id", propertyId)
      .lt("service_date", cutoffDate);

    if (cleanupCleaningError) {
      console.error("sync-ical fatal error", cleanupCleaningError);
      return createSuccessResponse(reservationsCreated, tasksCreated);
    }

    const { error: cleanupReservationsError } = await supabase
      .from("reservations")
      .delete()
      .eq("property_id", propertyId)
      .lt("check_out", cutoffDate);

    if (cleanupReservationsError) {
      console.error("sync-ical fatal error", cleanupReservationsError);
      return createSuccessResponse(reservationsCreated, tasksCreated);
    }

    const parsedReservations = parseICalReservations(icalText);

    console.log("cutoffDate", cutoffDate);
    console.log("parsedReservations", parsedReservations.length);

    const activeReservations = parsedReservations.filter((res) => {
      return res.check_out != null && res.check_out >= cutoffDate;
    });

    console.log("STEP 2 reservations checked");
    console.log("activeReservations", activeReservations.length);
    console.log("ignored old reservations", parsedReservations.length - activeReservations.length);

    if (!activeReservations.length) {
      return createSuccessResponse(reservationsCreated, tasksCreated);
    }

    const checkIns = activeReservations.filter((reservation) => reservation.check_in).map((reservation) => reservation.check_in);

    const { data: existingReservations } = checkIns.length
      ? await supabase
          .from("reservations")
          .select("check_in")
          .eq("property_id", propertyId)
          .in("check_in", checkIns)
      : { data: [] };

    const existingReservationKeys = new Set((existingReservations || []).map((r: { check_in: string }) => r.check_in));

    const newReservations = activeReservations
      .filter((reservation) => reservation.check_in)
      .filter((reservation) => !existingReservationKeys.has(reservation.check_in))
      .map((reservation) => ({
        property_id: propertyId,
        guest_name: reservation.summary || null,
        check_in: reservation.check_in,
        check_out: reservation.check_out || null,
        reservation_uid: null,
        imported_at: new Date().toISOString(),
        source: "ical",
      }));

    if (newReservations.length) {
      const { error } = await supabase.from("reservations").insert(newReservations);
      if (error) {
        console.error("sync-ical fatal error", error?.message || error);
        console.error("sync-ical fatal stack", error?.stack || "no stack");
        return createSuccessResponse(reservationsCreated, tasksCreated);
      }
      reservationsCreated = newReservations.length;
      console.log("STEP 3 reservations inserted");
    }

    const standardDay = property.standard_service_day || "Thursday";
    const weeklyServiceDates = Array.from(
      new Set(
        activeReservations
          .filter((reservation) => reservation.check_in)
          .map((reservation) => getServiceDateForWeek(reservation.check_in, standardDay))
      )
    );

    const { data: existingWeeklyTasks } = weeklyServiceDates.length
      ? await supabase
          .from("cleaning_tasks")
          .select("id, service_date, service_type, guest_ready, check_in_date")
          .eq("property_id", propertyId)
          .eq("service_type", "Weekly Standard")
          .in("service_date", weeklyServiceDates)
      : { data: [] };

    const existingWeeklyTaskMap = new Map<string, { id: string; service_date: string; service_type: string; guest_ready: boolean; check_in_date: string | null }>(
      (existingWeeklyTasks || []).map((task: { id: string; service_date: string; service_type: string; guest_ready: boolean; check_in_date: string | null }) => [task.service_date, task])
    );

    const { data: existingGuestReadyTasks } = checkIns.length
      ? await supabase
          .from("cleaning_tasks")
          .select("check_in_date, service_type")
          .eq("property_id", propertyId)
          .in("check_in_date", checkIns)
          .eq("service_type", "Guest Ready")
      : { data: [] };

    const existingGuestReadyKeys = new Set(
      (existingGuestReadyTasks || []).map((task: { check_in_date: string; service_type: string }) => `${task.check_in_date}|${task.service_type}`)
    );

    const pendingWeeklyTasks = new Map<string, { check_in_date: string | null; guest_ready: boolean }>();
    const weeklyTaskUpdates: Array<{ id: string; guest_ready: boolean; check_in_date: string | null }> = [];
    const guestReadyTasksToCreate: Array<Record<string, any>> = [];

    for (const reservation of activeReservations) {
      if (!reservation.check_in) continue;

      const service_date = getServiceDateForWeek(reservation.check_in, standardDay);
      const coveredByStandard = isCheckInCoveredByStandardDay(reservation.check_in, standardDay);
      const isSameDayAsStandard = reservation.check_in === service_date;
      const weeklyTask = existingWeeklyTaskMap.get(service_date);

      if (weeklyTask) {
        if (isSameDayAsStandard && (!weeklyTask.guest_ready || weeklyTask.check_in_date !== reservation.check_in)) {
          weeklyTaskUpdates.push({
            id: weeklyTask.id,
            guest_ready: true,
            check_in_date: reservation.check_in,
          });
          weeklyTask.guest_ready = true;
          weeklyTask.check_in_date = reservation.check_in;
        }
      } else {
        const pending = pendingWeeklyTasks.get(service_date);
        if (pending) {
          if (isSameDayAsStandard) {
            pending.guest_ready = true;
            pending.check_in_date = reservation.check_in;
          }
        } else {
          pendingWeeklyTasks.set(service_date, {
            check_in_date: isSameDayAsStandard ? reservation.check_in : null,
            guest_ready: isSameDayAsStandard,
          });
        }
      }

      if (!coveredByStandard) {
        const guestReadyServiceDate = getGuestReadyServiceDate(reservation, activeReservations);
        const guestReadyKey = `${reservation.check_in}|${guestReadyServiceDate}|Guest Ready`;
        if (!existingGuestReadyKeys.has(guestReadyKey)) {
          guestReadyTasksToCreate.push({
            property_id: propertyId,
            service_date: guestReadyServiceDate,
            scheduled_date: guestReadyServiceDate,
            suggested_date: guestReadyServiceDate,
            check_in_date: reservation.check_in,
            service_type: "Guest Ready",
            status: "Scheduled",
            off_cycle: true,
            guest_ready: true,
            charge: Number(property.default_off_cycle_charge ?? 65),
            notes: `Auto-created from iCal sync for check-in ${reservation.check_in}.`,
          });
          existingGuestReadyKeys.add(guestReadyKey);
        }
      }
    }

    const weeklyTasksToCreate = Array.from(pendingWeeklyTasks.entries()).map(([service_date, payload]) => ({
      property_id: propertyId,
      service_date,
      scheduled_date: service_date,
      suggested_date: service_date,
      check_in_date: payload.check_in_date,
      service_type: "Weekly Standard",
      status: "Scheduled",
      off_cycle: false,
      guest_ready: payload.guest_ready,
      charge: 0,
      notes: `Auto-created Weekly Standard for the week covering service date ${service_date}.`,
    }));

    if (weeklyTasksToCreate.length) {
      const { error } = await supabase.from("cleaning_tasks").insert(weeklyTasksToCreate);
      if (error) {
        console.error("sync-ical fatal error", error?.message || error);
        console.error("sync-ical fatal stack", error?.stack || "no stack");
        return createSuccessResponse(reservationsCreated, tasksCreated);
      }
      tasksCreated += weeklyTasksToCreate.length;
      console.log("STEP 4 weekly tasks created");
    }

    for (const update of weeklyTaskUpdates) {
      const { error } = await supabase
        .from("cleaning_tasks")
        .update({ guest_ready: update.guest_ready, check_in_date: update.check_in_date })
        .eq("id", update.id);
      if (error) {
        console.error("sync-ical fatal error", error?.message || error);
        console.error("sync-ical fatal stack", error?.stack || "no stack");
        return createSuccessResponse(reservationsCreated, tasksCreated);
      }
    }

    if (guestReadyTasksToCreate.length) {
      const { error } = await supabase.from("cleaning_tasks").insert(guestReadyTasksToCreate);
      if (error) {
        console.error("sync-ical fatal error", error?.message || error);
        console.error("sync-ical fatal stack", error?.stack || "no stack");
        return createSuccessResponse(reservationsCreated, tasksCreated);
      }
      tasksCreated += guestReadyTasksToCreate.length;
      console.log("STEP 5 guest ready tasks created");
    }

    console.log("STEP 6 returning success");
    return createSuccessResponse(reservationsCreated, tasksCreated);
  } catch (error) {
    console.error("sync-ical fatal error", error?.message || error);
    console.error("sync-ical fatal stack", error?.stack || "no stack");
    return createSuccessResponse(reservationsCreated, tasksCreated);
  }
});