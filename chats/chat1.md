# Mobile lab management system

_Started 2026-08-21 09:58 UTC_

---

## User

Design a mobile app for laboratory Information Management System

## Assistant



## Assistant

_[tool: list_files]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: view_image]_

_[tool: ask_user]_

Waiting on your answers about lab context, role, workflows, screens, fidelity, and device frame.

## User

Answered — context: Generic industrial/testing lab; role: Lab technician (sample handling, test entry); workflows: Sample login & tracking, Test/result entry, Approvals & QC review, Inventory/reagents & equipment, Chain of custody, Reports & certificates of analysis, Barcode/QR scanning, Notifications & alerts; screens: Login/auth, Dashboard/home, Sample list & search, Sample detail, New sample intake, Test result entry form, Certificate of analysis / report view, Barcode scanner, Notifications, Profile/settings; fidelity: Interactive prototype — click through real flows; frame: iOS; data: ge…

## Assistant

_[tool: copy_starter_component]_

_[tool: copy_files]_

_[tool: read_file]_

_[tool: dc_write]_

## Assistant

_[tool: grep]_

_[tool: read_file]_

_[tool: dc_write]_

_[tool: dc_write]_

_[tool: dc_js_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_html_str_replace]_

Now let's verify it renders and flows correctly.

_[tool: ready_for_verification]_

Built a 10-screen LIMS mobile prototype (login, dashboard, sample list/search/filter, sample detail with chain of custody, new sample intake, test result entry, certificate of analysis, barcode scanner simulation, notifications, profile) in an iOS frame, using Zekindo's design tokens. Click-through flows are wired end-to-end (login → dashboard → samples → detail → enter result → QA review → certificate; new sample creation; scan simulation; notifications linking to samples). Verification running in background — I'll flag anything it finds.

## User

Found issues — fixing…

## User

Found issues — fixing…

