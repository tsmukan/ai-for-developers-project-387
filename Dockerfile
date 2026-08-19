FROM node:24.19.0 AS frontend-build

WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./

ENV VITE_API_BASE_URL=
RUN npm run build

FROM python:3.12.14-slim AS runtime

WORKDIR /app
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/app ./app
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

RUN useradd --create-home --shell /usr/sbin/nologin appuser
USER appuser

ENV PORT=8000
EXPOSE 8000

CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]