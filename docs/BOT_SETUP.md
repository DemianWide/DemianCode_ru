# Бот-анкета для клиентов: подключение

Клиент пишет боту, бот проводит опрос (15 вопросов, фото, логотип), в конце вам в Telegram приходит
сообщение, файл `brief_<номер>.md` и фото. Потом вы скачиваете всё на компьютер скриптом и открываете чат
с Claude: он собирает сайт из шаблона-визитки по анкете.

Всё бесплатно: Cloudflare Workers + KV.

## 1. Хранилище KV
Cloudflare → Storage & Databases → KV → Create → имя `briefs`.

## 2. Привязка к Worker
Workers & Pages → ваш Worker → Settings → Bindings → Add → KV namespace:
имя переменной **BRIEFS**, namespace `briefs`.

## 3. Два новых секрета
Settings → Variables and Secrets → Add (тип Secret):
- `WEBHOOK_SECRET` — случайная строка из латиницы и цифр, 20-40 символов
- `ADMIN_KEY` — другая случайная строка, 30-40 символов

Сгенерировать на компьютере (PowerShell):
`-join ((48..57)+(97..122) | Get-Random -Count 32 | % {[char]$_})`
Значения никому не показывайте и в чат не вставляйте.

## 4. Новый код
Edit code → вставить целиком файл `serverless/worker.js` → Deploy.

## 5. Webhook Telegram
В PowerShell (подставьте свои значения, токен бота вводится только на вашем компьютере):

```
$t='ТОКЕН_БОТА'; $s='WEBHOOK_SECRET'
Invoke-RestMethod "https://api.telegram.org/bot$t/setWebhook" -Method Post -ContentType 'application/json' `
  -Body (@{url='https://frosty-glitter-0597.dimaon-98.workers.dev/tg'; secret_token=$s; allowed_updates=@('message')} | ConvertTo-Json)
```
Должно вернуться `ok : True`. Проверка: напишите боту `/start`.

Если бот @DemianCode_bot у вас уже используется для заявок с сайта, это нормально: он продолжает слать их вам,
а клиентам отвечает анкетой.

## 6. Скачивание анкеты
Создайте файл `tools\bot.config.ps1` (в git он не попадает):

```
$WorkerUrl = 'https://frosty-glitter-0597.dimaon-98.workers.dev'
$AdminKey  = 'ADMIN_KEY'
```
Запуск: `powershell -ExecutionPolicy Bypass -File tools\get_brief.ps1`
Появится папка `Clients\<компания>\` с `brief.md` и `photos\`. Дальше откройте чат с Claude, приложите эту
папку и напишите: «собери сайт по анкете».

## Ограничения
- Анкета хранится 90 дней, незавершённый опрос 7 дней.
- Принимаются фото (сжатые или файлом), до 15 штук; логотип подписывается словом «лого».
- Бесплатный лимит Cloudflare: 100 000 запросов в день, для этой задачи хватает с огромным запасом.
