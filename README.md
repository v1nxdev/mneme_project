# Mneme

**Save your working state. Pick up the thread.**

Mneme — персональний простір для проєктів і checkpoint-нотаток. Кожен checkpoint зберігає: що працює, що заважає, що вже пробував і який наступний крок. Є історія, пошук, архів, редагування, експорт JSON, анімований terminal intro і звуки інтерфейсу.

## Запуск через Docker

Потрібен Docker Desktop із запущеним Docker Engine.

```bash
docker compose up --build
```

Якщо встановлена стара окрема команда Compose, використайте `docker-compose up --build`.

Відкрийте **http://localhost:3000**. Перевірка Express і MongoDB: **http://localhost:3000/api/health**. Просте привітання сервера: **http://localhost:3000/api/hello**.

Compose запускає два сервіси: `app` та `mongo`. `app` чекає успішної MongoDB healthcheck. База не має відкритого порту на комп’ютері; застосунок доступний локально на порту 3000.

Зупинка без видалення даних:

```bash
docker compose down
```

## Volumes та автоматичне оновлення

- `.:/app` синхронізує код із контейнером.
- Окремий `node_modules` volume зберігає Linux-залежності контейнера.
- `mongo_data:/data/db` зберігає базу між перезапусками.
- **Vite HMR** оновлює React/CSS у браузері, **nodemon** перезапускає Node-процес після змін у `server/` або `core/`. Сам volume не перезапускає Node.

Для демонстрації змініть текст `Pick up the thread.` у `components/mneme.tsx` або колір у `styles/globals.css` та збережіть файл. Сторінка оновиться без перезапуску контейнера. Для перевірки backend змініть привітання в `server/app.mjs` і відкрийте `/api/hello` ще раз.

Після зміни залежностей оновіть `package-lock.json` через `npm install`, потім оновіть залежності у volume:

```bash
docker compose run --rm app npm ci
docker compose up --build
```

## Що перевірити перед здачею

1. `docker compose ps`: `app` і `mongo` працюють та мають healthy-статус.
2. Створіть проєкт і checkpoint. Перезавантажте сторінку: текст залишився.
3. Натисніть **Resume session**: показаний правильний наступний крок.
4. Перевірте редагування, пошук та архівування.
5. Змініть код і перевірте автоматичне оновлення.
6. Виконайте `docker compose down`, потім `docker compose up`: дані мають залишитися.
7. Зробіть власні скріншоти: вікно Mneme, `/api/health`, `docker compose ps`, зміна сторінки після редагування коду.

Завантажте цей проєкт на GitHub **без `node_modules`, `dist` і `.env`**. У LMS надішліть посилання на репозиторій і скріншоти запущених Docker-контейнерів. Звичайний скріншот сайту не підтверджує запуск Docker.

## Тести

```bash
npm test
```

Без MongoDB змінних запускаються domain-тести. Для реальної перевірки API у контейнері:

```bash
docker compose exec app npm test
```

Integration-тест створює окрему базу `mneme_test_<random>`, перевіряє збереження, конфлікт двох одночасних змін, валідацію, редагування і видалення, після чого видаляє тільки власну тестову базу. Дані робочого простору він не чіпає.

## Стек і структура

React + Vite, Express 5, MongoDB, Docker Compose. Frontend написаний у TSX, backend — звичайний JavaScript (`.mjs`).

- `components/mneme.tsx` — інтерфейс і запити до API.
- `styles/globals.css` — оформлення, адаптивність, анімації.
- `core/domain.mjs` — спільна валідація та правила зміни даних.
- `server/app.mjs` — Express API.
- `server/main.mjs` — MongoDB-підключення, Vite dev middleware або production static server.
- `components/ui/` — доступні UI-примітиви.
- `Dockerfile`, `docker-compose.yml` — образ і сервіси.

`Dockerfile` використовує `node:lts`, `/app`, `npm ci`, `EXPOSE 3000` і запуск Node. За замовчуванням образ збирає frontend для production; Compose вмикає development-режим із volumes для завдання.

## API

| Запит | Результат |
| --- | --- |
| GET `/api/hello` | Текст привітання |
| GET `/api/health` | Стан Express і MongoDB |
| GET `/api/workspace` | Проєкти, checkpoints та revision |
| POST `/api/workspace` | Зміна з `action`, `input` і поточним `revision` |

Приклад JSON для створення проєкту (підставте актуальний revision із GET):

```json
{"action":"project.create","input":{"name":"My project","description":"Something worth making","color":"lime"},"revision":0}
```

Дії: `project.create`, `project.update`, `project.delete`, `checkpoint.create`, `checkpoint.update`, `checkpoint.delete`, `examples.clear`.

Проєкти й checkpoints зберігаються в одному документі `workspaces` для цього персонального простору. Atomic revision-check не дозволяє двом вкладкам непомітно перезаписати роботу одна одної. Ліміт: 200 проєктів, 2 000 checkpoints, 4 MB JSON. API перевіряє типи, довжини, наявність проєкту і обов’язковий наступний крок.

## Налаштування

`PORT` — порт Express; `MONGODB_URI` — підключення до MongoDB; `NODE_ENV` — `development` або `production`. Compose передає їх автоматично. Для запуску без Docker налаштуйте локальну MongoDB, експортуйте `MONGODB_URI`, виконайте `npm ci` та `npm run dev`.

Звуки спочатку вимкнені. Натисніть значок звуку або увімкніть їх у Preferences. Анімації поважають системний reduced-motion; intro можна повторити у Preferences.

## Межі першої версії

Це **персональна версія**, без реєстрації, спільних просторів і розділення даних між користувачами. Не відкривайте її як загальнодоступний сервіс: перед публічним запуском потрібні облікові записи, перевірка власника кожного запиту, HTTPS, обмеження запитів і резервне копіювання. Локальний запуск для курсу цього не потребує.

Онлайн-версія для огляду дизайну використовує окрему hosted-базу. Цей вихідний пакет використовує Express і MongoDB; дані двох версій не синхронізуються.

Docker Engine не був доступний у середовищі підготовки. Факт запуску контейнерів і скріншоти для LMS потрібно підтвердити на комп’ютері з Docker. Перелік виконаних перевірок наведений у `VERIFICATION.md`.

Офіційні довідки: [Compose startup order](https://docs.docker.com/compose/how-tos/startup-order/), [Compose services and volumes](https://docs.docker.com/reference/compose-file/services/), [Express static files](https://expressjs.com/en/starter/static-files/).
