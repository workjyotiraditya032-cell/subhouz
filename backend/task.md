# Migration Task List

- [x] Create/update database helper or env config for webhook fallback
- [x] Refactor `backend/services/automation_service.py`
  - [x] Implement event-based dispatcher sending payloads to n8n webhooks
  - [x] Remove direct Meta WhatsApp Cloud API calls
  - [x] Clean up redundant service actions (e.g. manager lookups, formatting messages)
  - [x] Log n8n webhook status (success/failed) in `automation_logs`
- [x] Refactor `backend/routes/automation_routes.py`
  - [x] Remove `/api/automation/trigger-reminders` route
- [x] Refactor `backend/routes/enquiry_routes.py`
  - [x] Replace direct calls to `AutomationService` in `update_enquiry` with `EventBus.emit(BOOKING_CONFIRMED, ...)`
- [x] Refactor `backend/routes/rent_routes.py`
  - [x] Replace direct calls to `AutomationService` or custom logging with `EventBus.emit` or simplified event triggers
- [x] Refactor `frontend/src/pages/AutomationPage.js`
  - [x] Remove "Run Rent Reminders" button from UI header
  - [x] Remove related code, function handlers, and state variables for triggering manual reminders
- [x] Update and verify test suite in `backend/tests/test_automation_module.py`
  - [x] Mock HTTP request to n8n webhooks
  - [x] Ensure test coverage passes successfully
