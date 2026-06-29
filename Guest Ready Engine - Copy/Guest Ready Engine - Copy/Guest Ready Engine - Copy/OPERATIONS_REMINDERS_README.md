# Operations Reminders Feature

## Overview
Operations Reminders are property-specific follow-up items used for operational planning and management. They are completely separate from service tasks and scheduling logic.

## Use Cases
- Track repairs and maintenance work needed at a property
- Store owner requests and follow-up items
- Schedule property inspections or deep cleaning
- Manage seasonal maintenance reminders
- Track administrative tasks related to a property

## How to Enable

### Step 1: Create the Supabase Table
1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Create a new query
4. Copy and paste the contents of `supabase_setup_operations_reminders.sql`
5. Run the query

The table `operations_reminders` will be created with the following fields:
- `id` - UUID primary key
- `property_id` - Reference to properties table
- `title` - Reminder title (required, max 100 chars)
- `notes` - Additional details (optional)
- `due_date` - When the reminder is due (required)
- `status` - "Open" or "Completed"
- `created_at` - Timestamp of creation
- `completed_at` - Timestamp of completion

### Step 2: Use the Feature

#### Adding a Reminder
1. Go to **Properties** view
2. Find the property you want to add a reminder for
3. Click the **+ Reminder** button in the "Operations Reminders" section
4. Fill in:
   - **Title**: What needs to be done (e.g., "Fix fence", "Schedule pool cleaning")
   - **Notes**: Any additional details (optional)
   - **Due Date**: When it's due

#### Quick Due Date Options
Instead of manually entering a date, use the quick options:
- **Next Visit**: Due on the next scheduled cleaning task
- **7 Days**: Due 7 days from today
- **30 Days**: Due 30 days from today

#### Completing a Reminder
1. On the Properties page, find the reminder in the "Operations Reminders" section
2. Click **✓ Complete** to mark it done
3. The reminder will be removed from the open list

#### Deleting a Reminder
1. Click **Delete** on any reminder to remove it permanently

### Step 3: View Dashboard Widget
The **Today View** dashboard displays an "Operations Reminders" widget showing:
- **Overdue reminders** (due date has passed) - shown in red
- **Due soon reminders** (due within 3 days) - shown in orange

Click **✓ Complete** directly from the dashboard to mark reminders done.

## Design Principles
- **Separate from Service Tasks**: Reminders don't affect task scheduling or Guest Ready logic
- **Property-Scoped**: Each reminder belongs to a specific property
- **Simple Status**: Only "Open" or "Completed" - no complex workflows
- **Visual Alerts**: Color-coding shows urgency (overdue in red, due soon in orange)
- **Easy Management**: Add, complete, or delete reminders with a single click

## Fields Explained

### Title
Short description of what needs to be done. Examples:
- "Fix fence gate"
- "Schedule monthly pool cleaning"
- "Contact owner about property access"
- "Deep clean living room"

### Notes
Additional context or instructions. Examples:
- "Gate latch is broken, needs replacement"
- "Contact Jim's Pool Services at 555-0123"
- "Check with owner before proceeding"

### Due Date
When the reminder should be completed. The system will:
- Mark reminders as **OVERDUE** if the due date has passed
- Highlight reminders as **Due Soon** if due within 3 days
- Show them in the dashboard widget for quick visibility

### Status
- **Open**: Reminders that need attention (displayed in Properties and Dashboard)
- **Completed**: Reminders that are done (hidden from normal views)

## Properties View
Each property card now includes:
- "Operations Reminders" section
- Count of open reminders
- **+ Reminder** button to add new ones
- List of active reminders with:
  - Title and notes
  - Due date with urgency indicators
  - Complete and Delete buttons

## Dashboard Widget
The Today View now shows a "Operations Reminders" widget that displays:
- Count of overdue reminders
- Count of reminders due soon
- List of urgent reminders with property, title, and due date
- Quick access to complete reminders

## Example Workflow

1. **Monday morning**: You notice a fence gate issue at the "Beach House" property
   - Go to Properties → Beach House
   - Click "+ Reminder"
   - Title: "Fix fence gate"
   - Notes: "Latch is broken, needs replacement hardware"
   - Quick Option: "7 Days"
   - Save

2. **Dashboard visibility**: The reminder appears in the Today View widget if it's due soon/overdue

3. **Wednesday**: You contact a handyman and schedule the repair
   - The reminder is still visible as a follow-up item

4. **Friday**: The repair is done
   - Go to Properties → Beach House
   - Find the reminder in Operations Reminders section
   - Click "✓ Complete"
   - Reminder moves to completed status

## Notes
- Reminders are completely independent of service tasks and scheduling
- Deleting a property CASCADE deletes all its reminders
- Completed reminders are kept in the database (for history) but hidden from views
- The widget shows only overdue and due-soon reminders to reduce clutter
- Multiple reminders can exist for the same property
