# Бесплатная публикация: GitHub Pages + Cloudflare Worker

Сайт лежит на GitHub Pages (бесплатно, HTTPS есть), заявки идут в Telegram через бесплатный Cloudflare Worker.

## 1. Включить GitHub Pages (один раз)

1. Репозиторий → **Settings → Pages**.
2. В блоке **Build and deployment → Source** выберите **GitHub Actions**.
3. Любой `git push` в `main` теперь сам собирает `dist` (`.github/workflows/pages.yml`) и публикует сайт.
4. Адрес: `https://demianwide.github.io/DemianCode_ru/`.

## 2. Форма заявок (Cloudflare Worker)

1. Зарегистрируйтесь на cloudflare.com (бесплатно, карта не нужна).
2. **Workers & Pages → Create → Worker**, имя, например `demiancode-lead`. Нажмите **Deploy**, затем **Edit code**.
3. Удалите код-пример, вставьте содержимое `serverless/worker.js`, нажмите **Deploy**.
4. **Settings → Variables and Secrets** → добавьте:
   - `BOT_TOKEN` (тип Secret) — токен бота;
   - `CHAT_ID` (тип Secret) — ваш chat_id;
   - `ORIGINS` (тип Text) — `https://demianwide.github.io` (потом добавьте через запятую ваш домен).
5. Скопируйте адрес Worker'а вида `https://demiancode-lead.ВАШ-АККАУНТ.workers.dev`.
6. В `сайт_3/config.json`, блок `lead`, замените `"endpoint": "send.php"` на этот адрес. Запустите `python tools\build_dist.py` (он синхронизирует `config.js`), затем `git push`.

Токен бота живёт только в Cloudflare и не попадает ни в репозиторий, ни на страницу.

## 3. Свой домен (когда он готов)

1. В репозитории: **Settings → Pages → Custom domain**, впишите домен, включите **Enforce HTTPS**.
2. У регистратора в DNS домена:
   - для `www`: запись **CNAME** → `demianwide.github.io`;
   - для корня (`demiancode.ru`): четыре записи **A** → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`.
3. Подождите от нескольких минут до пары часов. GitHub сам выпустит бесплатный SSL.
4. В `ORIGINS` у Worker'а добавьте `https://ваш-домен.ru`.
