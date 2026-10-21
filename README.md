# Classroom Studio

Classroom Studio turns a chapter PDF into an editable, teacher-reviewable lesson, lets a teacher present or revise it in the browser, and exports the lesson as a PowerPoint (`.pptx`) with animated simulation slides.

## Run the full platform locally

Requirements: Docker Desktop with Compose. From the project directory, run:

```powershell
Copy-Item .env.example .env
docker compose up --build -d
```

Open [http://localhost:8080](http://localhost:8080) and create a workspace. Uploading a chapter creates a lesson and renders its animated PowerPoint automatically. Model mode is the default: Qwen writes the explanations from cited PDF pages, and local source-linked animations are added to the deck. On CPU, model generation can take several minutes for a long chapter; the PPTX rendering step itself is much shorter. Set `LESSON_GENERATION_MODE=fast` in `.env` to skip model rewriting and draft directly from cited PDF text. The Compose stack runs PostgreSQL, Redis, database migrations, the FastAPI service, background worker and retention scheduler, the PowerPoint renderer, and the Nginx web app. The local Ollama model is downloaded on first startup and requires an internet connection; lesson generation does not need a hosted model API key. Data persists in Compose volumes. Stop it with `docker compose down`; `docker compose down -v` also deletes the local database, queue, uploaded files, and downloaded model.

The first full startup also runs a one-time `reference-import` service. It indexes PDFs under `data/` into the shared local curriculum library before the API starts. The supplied folder contains 148 searchable NCERT PDFs (2,902 pages): Mathematics for Classes 1–8 and Science for Classes 6–8. Matching pages are retrieved as generation context; the Qwen model weights are not fine-tuned. To re-index after adding PDFs to `data/`, run `docker compose run --rm reference-import`.

For local development, start Docker Desktop, run `npm install` once, then run `npm run dev`. This starts the database, API, worker, PowerPoint exporter, and their required services through Docker Compose, waits for the API health check, and then starts Vite at [http://localhost:5173](http://localhost:5173). The first startup builds the containers, imports the local reference PDFs, and downloads the configured Ollama model, so it can take a while. The backend containers stay running after you stop Vite with Ctrl+C; stop them with `docker compose down` when you are finished. The API is published on `127.0.0.1:8000` for the Vite proxy.

## What works

- Email and password workspace registration, sign-in, sign-out, Argon2 password hashes, short-lived access tokens, rotated HttpOnly refresh cookies, and workspace-scoped lesson access.
- PDF uploads up to 50 MB, background lesson jobs, full page text extraction, per-page OCR for scanned pages, page references, and a visible chapter coverage report. Processing accepts chapters up to 300 pages. Source PDFs and generated PPTX files are removed after the configured retention period (30 days by default); edited lesson content remains in the workspace.
- Syllabus PDFs can be saved to a private workspace reference library and matched by board, class, and subject. Relevant syllabus pages guide class scope and terminology in later chapter lessons; chapter PDFs remain the source for lesson facts, citations, and visual checks. This retrieval step does not fine-tune or retrain model weights.
- Model chapter generation processes page-bounded sections with local Qwen rewriting by default. Fast mode is an opt-in source-extraction fallback. Uploads support primary EVS and Science, Mathematics, Social Studies and its History/Geography/Political Science/Economics branches, plus the existing subject choices. Choose a subject explicitly so a PDF is not silently treated as Physics.
- Visual-first chapter sections pair student-facing explanations with editable, source-grounded diagrams and custom simulations. Local rules use cited chapter wording to build up to 12 distinct animations without waiting for model inference.
- In model mode, simulations are generated as validated visual descriptions: source-specific objects, labeled relationships, plots, particles, animated characters, motion tracks, and controls. The platform checks generated labels, controls, numbers and citations against cited page text. If a model cannot be verified, it uses a locally rendered topic map built from source wording and marks it for teacher review. The renderer accepts only a safe set of drawing primitives and animation operations; it never runs model-written code. Browser playback keeps controls interactive, and PowerPoint exports embed looping GIFs.
- Saved lesson editing, presenter mode, job progress, and animated PowerPoint downloads with speaker notes and source page references.
- An asynchronous PPTX renderer. Animation slides embed higher-resolution looping GIFs rendered from their chapter model, with a short key idea and a pause-and-predict prompt. PPTX cannot run the web studio's interactive sliders, so parameter sweeps are baked into the exported animation.
- Curriculum-outcome import and matching hooks, with source and licence metadata. Matches are surfaced as suggestions, not official approval. An empty curriculum store is explicitly reported as unverified.
- Persistent teacher feedback tied to a workspace, lesson, and slide. Configure `FEEDBACK_ADMIN_TOKEN` and fetch reports from `GET /api/v1/admin/feedback` with the `X-Feedback-Admin-Key` header.
- API and worker separation, retries, rate limits for sign-in, registration, and PDF uploads, health checks, restrictive browser security headers, and private local or S3-compatible object storage.

## Configuration

Copy `.env.example` to `.env`. For local Compose, its values are development-only. `LESSON_GENERATION_MODE=model` is the default; choose `fast` to skip rewriting and use source-extracted wording. `OLLAMA_MODEL=qwen3:1.7b` is the default; Compose downloads it on first startup. `OLLAMA_BASE_URL` defaults to the Compose Ollama service. To try GPU acceleration with a native Windows Ollama installation, set `OLLAMA_BASE_URL=http://host.docker.internal:11434` and configure Ollama on Windows to listen on a host address reachable from Docker. Ollama documents Vulkan support for Windows, including Intel GPUs, but acceleration depends on the installed driver and device; check `ollama ps` to confirm the model is using the GPU. The current Docker Ollama service in this setup has no Intel GPU device attached, so its model runs on CPU. Uploaded PDFs and syllabus pages are retrieved as source context; they do not fine-tune model weights.

In production, use a randomly generated `APP_SECRET` of at least 32 characters, strong database and Redis credentials, a private S3-compatible bucket, and a real HTTPS origin in `ALLOWED_ORIGINS`. Do not use the development values from `.env.example`. Prefer workload identity for S3 access where available. Restrict bucket access to the application, enable provider-side versioning or backups as needed, and set a lifecycle policy that agrees with your data-retention policy.

PDF text and syllabus references stay inside the local Docker platform. Lesson generation retrieves relevant pages from uploaded references; it does not fine-tune the model weights.

To add licensed curriculum outcomes, POST a JSON payload to `/api/v1/admin/curriculum/import` with the `X-Curriculum-Import-Key` header. Set `CURRICULUM_IMPORT_TOKEN` first and include the board, grade, subject, source URL, licence, version, and outcome records. Only import data the school or operator has permission to use.

## Kubernetes deployment baseline

The `k8s/` directory contains namespace, configuration, platform, migration-job, and network-policy manifests. It is a deployment baseline, not a turnkey hosted service. Before applying it:

1. Build and push the API, exporter, and web images to your registry; replace `REPLACE_WITH_RELEASE_TAG` in the manifests with an immutable tag.
2. Set the hostname and allowed origin in `k8s/configmap.yaml`; configure a TLS secret and an NGINX ingress controller.
3. Create the `classroom-secrets` secret in `classroom-studio` with `APP_SECRET`, `POSTGRES_PASSWORD`, and `REDIS_PASSWORD`. Add S3 credentials only if using static credentials, plus optional `CURRICULUM_IMPORT_TOKEN` and `FEEDBACK_ADMIN_TOKEN` keys as needed. Local Ollama generation does not need a model API key. Use a secret manager or workload identity in a real cluster; do not commit Secret manifests.
4. Configure a storage class, persistent-volume capacity, object-storage bucket, DNS, TLS, ingress forwarded-header handling, and resource quotas for your cluster.
5. Apply the namespace and configuration, then start Postgres, Redis, and the local Ollama model service. Ollama downloads Qwen3 1.7B on first startup, so allow several gigabytes of persistent storage and wait for that download to finish:

   ```sh
   kubectl apply -f k8s/namespace.yaml
   kubectl apply -f k8s/configmap.yaml
   kubectl apply -f k8s/data-services.yaml
   kubectl -n classroom-studio rollout status statefulset/postgres
   kubectl -n classroom-studio rollout status statefulset/redis
   kubectl -n classroom-studio rollout status statefulset/ollama --timeout=30m
   ```

6. Run and wait for the one-time schema migration, then start the application and network policies:

   ```sh
   kubectl apply -f k8s/migration-job.yaml
   kubectl -n classroom-studio wait --for=condition=complete job/classroom-migrate --timeout=5m
   kubectl apply -f k8s/platform.yaml
   kubectl apply -f k8s/network-policy.yaml
   ```

The sample Postgres and Redis StatefulSets are single-instance starting points. For a public production service, use managed highly available database and cache services, automated tested backups and restore procedures, image scanning/signing, external metrics and error reporting, and a tested incident/retention process. The network policies require a CNI that enforces Kubernetes NetworkPolicy; they also assume the ingress controller uses the labels shown in `k8s/network-policy.yaml`. The API/worker HPAs require Metrics Server.

## Current product boundaries

This is a deployable full-stack platform foundation, but several larger product capabilities still need dedicated services and content work:

- Generated simulation visuals use safe declarative Canvas primitives, with deterministic fallback maps for source-linked concepts. Manim, Blender, VMD, Webots, Omniverse, Maya, and GPU render farms are not installed or executed by this release.
- Curriculum imports are provided, but no board-approved or licensed outcome dataset is bundled. Until an operator imports a reviewed dataset, alignment is unverified.
- The workspace is teacher-led and single-owner. Student accounts, invitations and roles, password recovery/email verification, public sharing, billing, multilingual generation, and mobile applications are not implemented.
- Drafts require teacher review. There is no subject-expert approval queue, automated scientific validation, image/equation extraction pipeline, or formal evaluation dataset yet. Feedback is stored for review but there is no in-app admin dashboard.
- The Kubernetes manifests do not provision a cloud account, managed database, GPU node pool, backup service, domain, TLS certificate, monitoring stack, or a production curriculum corpus.

Generated simulations are explanatory models, not experimental evidence. The AI records assumptions in teacher notes, cites source pages, and uses a qualitative visual when the chapter does not support numeric values. The PowerPoint contains animated GIF renditions of the generated models; interactive controls remain in the browser studio.
