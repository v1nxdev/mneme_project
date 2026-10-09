# Verification — Mneme 0.1

Checked on 9 October 2026.

## Passed

- React/TypeScript check for the review application.
- Production builds of the hosted application and standalone React frontend.
- Express server source syntax checks.
- Three domain tests: sample cleanup preserves user-created work; rejected saves do not mutate data; archived projects reject new checkpoints and deletion leaves no orphan checkpoints.
- Browser: created a project, saved a checkpoint containing all four fields, reloaded the page, and verified the exact next step and context in the resume panel.
- Responsive browser check at 390 px: layout fits the screen; the mobile menu opens, navigates to checkpoints, and closes correctly.
- Generated database migration reviewed; the hosted review uses durable D1 storage.

## Outstanding

- Docker Engine and the Docker CLI were unavailable. `docker compose up`, container health, bind-mount hot reload, and container restart persistence have not been run here.
- A disposable MongoDB 8.2 server was downloaded for integration testing, but the execution environment rejected its startup with `open: Operation not permitted`. The MongoDB API integration test is included and is marked skipped when no database URI is provided; it has not passed against a live MongoDB instance here.
- The hosted review and course build use different databases. Success against D1 is not evidence that the MongoDB integration test passed.
- Sound behavior is implemented with Web Audio, but audio fidelity was not listened to on physical devices.
- WebMCP browser tools were feature-detected; this browser did not expose the registrations, so that optional integration was not validated end to end.

Follow README.md to run the remaining Docker checks and take real Docker screenshots for the course. This document records the actual verification status, not a guarantee of zero defects.
