<?php
// Скопируйте этот файл в send.config.php (рядом с send.php) и впишите свои значения.
// send.config.php НЕЛЬЗЯ выкладывать в репозиторий (он в .gitignore) и показывать посторонним.
return [
    'token'   => '123456789:AA...',          // токен бота от @BotFather
    'chat_id' => '123456789',                // ваш chat_id (см. README)
    'origins' => ['https://ваш-домен.ru'],   // откуда разрешены заявки; пусто = без проверки
    // 'proxy' => 'socks5://host:port',      // если хостинг не достаёт до api.telegram.org
];
