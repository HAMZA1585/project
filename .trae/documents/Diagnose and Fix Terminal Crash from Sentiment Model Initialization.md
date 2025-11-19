## Root Cause

* The backend imports `backend/app/services/sentiment.py` during app startup via blueprints in `backend/app/__init__.py:75`.

* If the Hugging Face pipeline cannot load, `services/sentiment.py:103–110` calls `sys.exit(1)`, which terminates the process and your terminal shows an abrupt exit.

* Common causes:

  * Missing Python deps (`transformers`, `torch`) or incompatible Torch wheel on Windows.

  * No internet for first-time model download or blocked by firewall/SSL.

  * Cache folder not writable (`HF_HOME`/`TRANSFORMERS_CACHE`).

## Verification Steps

* Confirm crash path by checking that `services/sentiment.py` exits on failure (backend/app/services/sentiment.py:103–110).

* Validate usage in tasks: the line you opened is used when creating an `Article` (`backend/app/tasks.py:612`). That code is safe because `sent_score` is initialized earlier (lines 592–601), so the crash is not from this line.

* Ensure client calls go to `http://localhost:5000` (`client/src/Services/api.js:5, 7–13`) and that CORS allows `5173` (`backend/app/__init__.py:41–45`).

## Fix Options

* Option A (recommended minimal change): Install required dependencies and allow the model to load correctly.

  * `pip install transformers`

  * CPU-only Torch on Windows: `pip install --index-url https://download.pytorch.org/whl/cpu torch torchvision torchaudio`

  * Ensure network access. If corporate proxy, set `HTTPS_PROXY` and `HTTP_PROXY`.

  * Optionally set a writable cache: `set HF_HOME=%USERPROFILE%\.cache\huggingface` (Windows PowerShell)

* Option B (code resilience): Make sentiment initialization lazy and non-fatal.

  * Remove import-time `sys.exit(1)` in `backend/app/services/sentiment.py:103–110`.

  * Initialize the model on first use and return a clear error (503) when unavailable, rather than crashing the whole app.

  * Keep task-side guards (already present in `backend/app/tasks.py:594–601`) so ingestion continues with `None` sentiment.

* Option C (feature flag for dev): Allow disabling the model in development when you just need the app to run.

  * Add `DISABLE_SENTIMENT=true` handling in `create_app()` and sentiment service to skip model load and return neutral placeholder.

## Implementation Plan

1. Backend dependencies

   * Add/install `transformers` and Torch CPU as above; verify import.
2. Code hardening (if you choose Option B/C)

   * Edit `backend/app/services/sentiment.py`:

     * Remove import-time initialization and `sys.exit(1)`; expose `initialize_sentiment_model()` and a `get_sentiment_model()` helper.

     * Update `analyze_sentiment()` to handle `None` by raising a descriptive `RuntimeError` that route handlers translate to 503.

   * Update `backend/app/sentiment_routes.py` to catch `RuntimeError` and respond 503 with `{ error: "Sentiment temporarily unavailable" }`.

   * Optionally add an env flag (`DISABLE_SENTIMENT`) in `backend/app/__init__.py` to skip loading and register routes that return a neutral placeholder.
3. Testing

   * Start backend (`python run.py`) and ensure it stays up even when `transformers`/Torch are missing.

   * Hit `/api/v1/sentiment` and verify proper 200 responses when the model loads, and 503 fallback if disabled/unavailable.

   * Ingest a sample article and confirm `sentiment_label`/`sentiment_score` assignment succeeds or is `None` without crashing (`backend/app/tasks.py:592–613`).

## Expected Outcome

* No more terminal crashes on startup.

* Clear, controllable behavior for sentiment in dev and production.

* Client (`vite` on port 5173) continues to access backend on `:5000` with CORS working.

## Next Steps

* I will implement Option A first (deps) and, if you prefer, apply Option B/C to harden startup. Confirm which option(s) you want, and I’ll proceed immediately.

