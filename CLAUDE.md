# FlowTest Development Guidelines

## Build & Run Commands
- Backend: `python manage.py runserver`  
- Services: `python start_services.py` (starts Redis, Celery, Django)
- Celery: `celery -A FlowTest worker --pool=solo --loglevel=info`
- Frontend: `npm run build:css` (compile Tailwind CSS)
- Watch CSS: `npm run watch:css` (auto-rebuild on changes)

## Test Commands
- Run all tests: `pytest`
- Run single test: `pytest path/to/test_file.py::test_function_name -v`
- Default options in pytest.ini: `--headed --video=on`

## Lint & Type Check
- Python linting: `flake8`
- CSS building: `npm run build:css`

## Code Style Guidelines
- Backend: Django with PostgreSQL database
- Frontend: HTML + Tailwind CSS + JavaScript (Vue.js being phased out)
- Localization: Support for three languages (Russian, English, German)
- Prefer 4-space indentation for Python, 2-space for HTML/JS
- Error handling: Use try/except blocks with specific exception types
- Document all API endpoints and complex functions
- Keep JavaScript functions small and focused
- Store translations in locales/en.json, locales/ru.json, locales/de.json
- Use i18n.js for handling internationalization across the app