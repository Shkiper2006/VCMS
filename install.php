<?php

declare(strict_types=1);

session_start();

const INSTALL_LOCK_FILE = __DIR__ . '/storage/installed.lock';
const ENV_EXAMPLE_FILE = __DIR__ . '/.env.example';
const ENV_FILE = __DIR__ . '/.env';
const INITIAL_SCHEMA_FILE = __DIR__ . '/database/migrations/0001_create_initial_schema.sql';

function h(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function normalizeUrl(string $url): string
{
    return rtrim(trim($url), '/');
}

function old(string $section, string $key, string $default = ''): string
{
    $value = $_SESSION['install'][$section][$key] ?? $default;

    return is_string($value) ? $value : $default;
}

function redirectToStep(int $step): never
{
    header('Location: install.php?step=' . $step);
    exit;
}

function dbDsn(array $db): string
{
    return sprintf(
        'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
        $db['host'],
        $db['port'],
        $db['database']
    );
}

function connectToDatabase(array $db): PDO
{
    return new PDO(dbDsn($db), $db['username'], $db['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
}

function splitSqlStatements(string $sql): array
{
    $statements = [];
    $current = '';
    $quote = null;
    $length = strlen($sql);

    for ($index = 0; $index < $length; $index++) {
        $character = $sql[$index];
        $next = $index + 1 < $length ? $sql[$index + 1] : '';

        if ($quote === null && $character === '-' && $next === '-') {
            while ($index < $length && $sql[$index] !== "\n") {
                $index++;
            }
            continue;
        }

        if ($quote === null && $character === '/' && $next === '*') {
            $index += 2;
            while ($index < $length - 1 && !($sql[$index] === '*' && $sql[$index + 1] === '/')) {
                $index++;
            }
            $index++;
            continue;
        }

        if (($character === "'" || $character === '"') && ($index === 0 || $sql[$index - 1] !== '\\')) {
            if ($quote === null) {
                $quote = $character;
            } elseif ($quote === $character) {
                $quote = null;
            }
        }

        if ($quote === null && $character === ';') {
            $statement = trim($current);
            if ($statement !== '') {
                $statements[] = $statement;
            }
            $current = '';
            continue;
        }

        $current .= $character;
    }

    $statement = trim($current);
    if ($statement !== '') {
        $statements[] = $statement;
    }

    return $statements;
}

function isIgnorableMigrationException(PDOException $exception): bool
{
    $driverCode = (int) ($exception->errorInfo[1] ?? 0);

    return $driverCode === 1050 || $driverCode === 1061;
}

function executeMigration(PDO $pdo, string $migrationSql): void
{
    foreach (splitSqlStatements($migrationSql) as $statement) {
        try {
            $pdo->exec($statement);
        } catch (PDOException $exception) {
            if (isIgnorableMigrationException($exception)) {
                continue;
            }

            throw $exception;
        }
    }
}

function envValue(string $value): string
{
    if ($value === '') {
        return '';
    }

    if (preg_match('/^[A-Za-z0-9_:\/.@-]+$/', $value) === 1) {
        return $value;
    }

    return '"' . str_replace(["\\", '"', "\n", "\r"], ["\\\\", '\\"', '\\n', ''], $value) . '"';
}

function writeEnvironmentFile(array $site, array $db): void
{
    $values = [
        'APP_NAME' => $site['name'],
        'APP_URL' => $site['url'],
        'DB_CONNECTION' => 'mysql',
        'DB_HOST' => $db['host'],
        'DB_PORT' => $db['port'],
        'DB_DATABASE' => $db['database'],
        'DB_USERNAME' => $db['username'],
        'DB_PASSWORD' => $db['password'],
    ];

    $template = is_file(ENV_EXAMPLE_FILE) ? file(ENV_EXAMPLE_FILE, FILE_IGNORE_NEW_LINES) : [];
    $seen = [];
    $lines = [];

    foreach ($template as $line) {
        if (preg_match('/^([A-Z0-9_]+)=/', $line, $matches) === 1 && array_key_exists($matches[1], $values)) {
            $key = $matches[1];
            $lines[] = $key . '=' . envValue($values[$key]);
            $seen[$key] = true;
            continue;
        }

        $lines[] = $line;
    }

    foreach ($values as $key => $value) {
        if (!isset($seen[$key])) {
            $lines[] = $key . '=' . envValue($value);
        }
    }

    if (file_put_contents(ENV_FILE, implode(PHP_EOL, $lines) . PHP_EOL, LOCK_EX) === false) {
        throw new RuntimeException('Не удалось записать файл .env. Проверьте права на запись в корне проекта.');
    }
}

function createInstallLock(array $site): void
{
    $storageDir = dirname(INSTALL_LOCK_FILE);

    if (!is_dir($storageDir) && !mkdir($storageDir, 0775, true) && !is_dir($storageDir)) {
        throw new RuntimeException('Не удалось создать каталог storage для флаг-файла установки.');
    }

    $payload = json_encode([
        'site_url' => $site['url'],
        'installed_at' => gmdate('c'),
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

    if ($payload === false || file_put_contents(INSTALL_LOCK_FILE, $payload . PHP_EOL, LOCK_EX) === false) {
        throw new RuntimeException('Не удалось создать флаг-файл storage/installed.lock.');
    }
}

function runInstallation(array $site, array $db, array $admin): void
{
    if (!is_file(INITIAL_SCHEMA_FILE)) {
        throw new RuntimeException('Файл миграции database/migrations/0001_create_initial_schema.sql не найден.');
    }

    $migrationSql = file_get_contents(INITIAL_SCHEMA_FILE);
    if ($migrationSql === false) {
        throw new RuntimeException('Не удалось прочитать SQL миграции.');
    }

    $pdo = connectToDatabase($db);

    try {
        executeMigration($pdo, $migrationSql);
        $pdo->beginTransaction();

        $passwordHash = password_hash($admin['password'], PASSWORD_DEFAULT);
        if ($passwordHash === false) {
            throw new RuntimeException('Не удалось создать хеш пароля администратора.');
        }

        $userStatement = $pdo->prepare(
            "INSERT INTO users (email, password_hash, name, role) VALUES (:email, :password_hash, :name, 'admin') "
            . "ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), name = VALUES(name), role = VALUES(role)"
        );
        $userStatement->execute([
            ':email' => $admin['email'],
            ':password_hash' => $passwordHash,
            ':name' => $admin['name'],
        ]);

        $settingsStatement = $pdo->prepare(
            'INSERT INTO site_settings (id, site_name, site_description, site_url, installed_at) '
            . 'VALUES (1, :site_name, :site_description, :site_url, NOW()) '
            . 'ON DUPLICATE KEY UPDATE site_name = VALUES(site_name), site_description = VALUES(site_description), site_url = VALUES(site_url)'
        );
        $settingsStatement->execute([
            ':site_name' => $site['name'],
            ':site_description' => $site['description'],
            ':site_url' => $site['url'],
        ]);

        $pdo->commit();
    } catch (Throwable $exception) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }

        throw $exception;
    }

    writeEnvironmentFile($site, $db);
    createInstallLock($site);
}

function validateSite(array $input): array
{
    $site = [
        'name' => trim((string) ($input['site_name'] ?? '')),
        'description' => trim((string) ($input['site_description'] ?? '')),
        'url' => normalizeUrl((string) ($input['site_url'] ?? '')),
    ];

    $errors = [];
    if ($site['name'] === '') {
        $errors[] = 'Укажите название сайта.';
    }
    if ($site['url'] === '' || filter_var($site['url'], FILTER_VALIDATE_URL) === false) {
        $errors[] = 'Укажите корректный URL сайта, например https://example.com.';
    }

    return [$site, $errors];
}

function validateDatabase(array $input): array
{
    $db = [
        'host' => trim((string) ($input['db_host'] ?? 'localhost')),
        'port' => trim((string) ($input['db_port'] ?? '3306')),
        'database' => trim((string) ($input['db_database'] ?? '')),
        'username' => trim((string) ($input['db_username'] ?? '')),
        'password' => (string) ($input['db_password'] ?? ''),
    ];

    $errors = [];
    if ($db['host'] === '') {
        $errors[] = 'Укажите хост MySQL.';
    }
    if (filter_var($db['port'], FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 65535]]) === false) {
        $errors[] = 'Укажите корректный порт MySQL.';
    }
    if ($db['database'] === '') {
        $errors[] = 'Укажите имя базы данных.';
    }
    if ($db['username'] === '') {
        $errors[] = 'Укажите имя пользователя MySQL.';
    }

    return [$db, $errors];
}

function validateAdmin(array $input): array
{
    $admin = [
        'name' => trim((string) ($input['admin_name'] ?? '')),
        'email' => trim((string) ($input['admin_email'] ?? '')),
        'password' => (string) ($input['admin_password'] ?? ''),
        'password_confirmation' => (string) ($input['admin_password_confirmation'] ?? ''),
    ];

    $errors = [];
    if ($admin['name'] === '') {
        $errors[] = 'Укажите имя администратора.';
    }
    if ($admin['email'] === '' || filter_var($admin['email'], FILTER_VALIDATE_EMAIL) === false) {
        $errors[] = 'Укажите корректный email администратора.';
    }
    if (strlen($admin['password']) < 8) {
        $errors[] = 'Пароль администратора должен быть не короче 8 символов.';
    }
    if ($admin['password'] !== $admin['password_confirmation']) {
        $errors[] = 'Пароль и подтверждение пароля не совпадают.';
    }

    unset($admin['password_confirmation']);

    return [$admin, $errors];
}

$errors = [];
$success = false;
$installedSiteUrl = null;
$step = max(1, min(4, (int) ($_GET['step'] ?? 1)));

if (is_file(INSTALL_LOCK_FILE)) {
    $installedData = json_decode((string) file_get_contents(INSTALL_LOCK_FILE), true);
    $siteUrl = is_array($installedData) && isset($installedData['site_url']) ? (string) $installedData['site_url'] : '/';
    ?>
    <!doctype html>
    <html lang="ru">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>VCMS уже установлен</title>
        <style>body { align-items: center; background: #f4f6fb; color: #172033; display: flex; font-family: Inter, system-ui, sans-serif; justify-content: center; margin: 0; min-height: 100vh; padding: 32px; } .installer-card { background: #fff; border: 1px solid #dde3f0; border-radius: 24px; box-shadow: 0 24px 70px rgba(31, 44, 71, .12); max-width: 760px; padding: 36px; } .eyebrow { color: #5369f8; font-size: 12px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; } .button { background: #5369f8; border-radius: 12px; color: #fff; display: inline-block; font-weight: 800; padding: 12px 18px; text-decoration: none; } code { background: #eef2ff; border-radius: 6px; padding: 2px 6px; }</style>
    </head>
    <body>
        <main class="installer-card">
            <p class="eyebrow">VCMS installer</p>
            <h1>Установка уже выполнена</h1>
            <p>Повторная установка заблокирована флаг-файлом <code>storage/installed.lock</code>.</p>
            <a class="button" href="<?= h($siteUrl) ?>">Перейти на сайт</a>
        </main>
    </body>
    </html>
    <?php
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $postedStep = (int) ($_POST['step'] ?? $step);

    if ($postedStep === 1) {
        [$site, $errors] = validateSite($_POST);
        $_SESSION['install']['site'] = $site;
        if ($errors === []) {
            redirectToStep(2);
        }
        $step = 1;
    } elseif ($postedStep === 2) {
        [$db, $errors] = validateDatabase($_POST);
        $_SESSION['install']['db'] = $db;

        if ($errors === []) {
            try {
                connectToDatabase($db);
            } catch (Throwable $exception) {
                $errors[] = 'Не удалось подключиться к MySQL: ' . $exception->getMessage();
            }
        }

        if ($errors === []) {
            redirectToStep(3);
        }
        $step = 2;
    } elseif ($postedStep === 3) {
        [$admin, $errors] = validateAdmin($_POST);
        $_SESSION['install']['admin'] = $admin;
        if ($errors === []) {
            redirectToStep(4);
        }
        $step = 3;
    } elseif ($postedStep === 4) {
        $site = $_SESSION['install']['site'] ?? null;
        $db = $_SESSION['install']['db'] ?? null;
        $admin = $_SESSION['install']['admin'] ?? null;

        if (!is_array($site) || !is_array($db) || !is_array($admin)) {
            $errors[] = 'Данные установки неполные. Начните установку заново.';
            $step = 1;
        } else {
            try {
                runInstallation($site, $db, $admin);
                unset($_SESSION['install']);
                $installedSiteUrl = $site['url'];
                $success = true;
            } catch (Throwable $exception) {
                $errors[] = 'Установка не завершена: ' . $exception->getMessage();
                $step = 4;
            }
        }
    }
}

$stepTitles = [
    1 => 'Сайт',
    2 => 'MySQL',
    3 => 'Администратор',
    4 => 'Установка',
];

$inlineCss = <<<'CSS'
:root { color-scheme: light; font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
body { align-items: center; background: #f4f6fb; color: #172033; display: flex; justify-content: center; margin: 0; min-height: 100vh; padding: 32px; }
.installer-card { background: #fff; border: 1px solid #dde3f0; border-radius: 24px; box-shadow: 0 24px 70px rgba(31, 44, 71, .12); max-width: 760px; padding: 36px; width: min(760px, 100%); }
.eyebrow { color: #5369f8; font-size: 12px; font-weight: 800; letter-spacing: .12em; margin: 0 0 8px; text-transform: uppercase; }
h1 { font-size: clamp(28px, 4vw, 42px); line-height: 1.1; margin: 0 0 12px; }
p { line-height: 1.65; }
.steps { display: grid; gap: 8px; grid-template-columns: repeat(4, 1fr); margin: 28px 0; }
.step { background: #eef2ff; border-radius: 999px; color: #64708a; font-size: 13px; font-weight: 700; padding: 10px 12px; text-align: center; }
.step.active { background: #5369f8; color: #fff; }
form { display: grid; gap: 18px; }
label { display: grid; font-size: 14px; font-weight: 700; gap: 8px; }
input, textarea { border: 1px solid #cbd4e6; border-radius: 12px; font: inherit; padding: 12px 14px; }
textarea { min-height: 110px; resize: vertical; }
.actions { display: flex; flex-wrap: wrap; gap: 12px; justify-content: space-between; margin-top: 8px; }
.button, button { background: #5369f8; border: 0; border-radius: 12px; color: #fff; cursor: pointer; display: inline-block; font: inherit; font-weight: 800; padding: 12px 18px; text-decoration: none; }
.button.secondary { background: #e8ecf7; color: #253047; }
.errors { background: #fff1f2; border: 1px solid #fecdd3; border-radius: 14px; color: #9f1239; margin: 18px 0; padding: 14px 18px; }
.summary { background: #f8fafc; border: 1px solid #dde3f0; border-radius: 16px; display: grid; gap: 8px; margin: 18px 0; padding: 18px; }
.summary div { display: flex; gap: 8px; justify-content: space-between; }
code { background: #eef2ff; border-radius: 6px; padding: 2px 6px; }
CSS;
?>
<!doctype html>
<html lang="ru">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Установка VCMS</title>
    <style><?= $inlineCss ?></style>
</head>
<body>
<main class="installer-card">
    <p class="eyebrow">VCMS installer</p>
    <?php if ($success): ?>
        <h1>Установка завершена</h1>
        <p>Миграция выполнена, настройки сохранены в <code>.env</code>, создан начальный администратор и флаг <code>storage/installed.lock</code>.</p>
        <a class="button" href="<?= h($installedSiteUrl ?? '/') ?>">Перейти на сайт</a>
    <?php else: ?>
        <h1>Установка VCMS</h1>
        <p>Заполните параметры сайта, подключение к MySQL и учетную запись первого администратора.</p>

        <div class="steps" aria-label="Шаги установки">
            <?php foreach ($stepTitles as $number => $title): ?>
                <span class="step <?= $number === $step ? 'active' : '' ?>"><?= $number ?>. <?= h($title) ?></span>
            <?php endforeach; ?>
        </div>

        <?php if ($errors !== []): ?>
            <div class="errors" role="alert">
                <strong>Проверьте данные:</strong>
                <ul>
                    <?php foreach ($errors as $error): ?>
                        <li><?= h($error) ?></li>
                    <?php endforeach; ?>
                </ul>
            </div>
        <?php endif; ?>

        <?php if ($step === 1): ?>
            <form method="post">
                <input type="hidden" name="step" value="1">
                <label>Название сайта
                    <input name="site_name" required value="<?= h(old('site', 'name', 'VCMS')) ?>">
                </label>
                <label>Описание сайта
                    <textarea name="site_description"><?= h(old('site', 'description', 'Минимальное ядро CMS-движка')) ?></textarea>
                </label>
                <label>URL сайта
                    <input name="site_url" required type="url" value="<?= h(old('site', 'url', 'http://localhost:3000')) ?>">
                </label>
                <div class="actions"><span></span><button type="submit">Далее</button></div>
            </form>
        <?php elseif ($step === 2): ?>
            <form method="post">
                <input type="hidden" name="step" value="2">
                <label>Хост MySQL
                    <input name="db_host" required value="<?= h(old('db', 'host', 'localhost')) ?>">
                </label>
                <label>Порт MySQL
                    <input name="db_port" required inputmode="numeric" value="<?= h(old('db', 'port', '3306')) ?>">
                </label>
                <label>Имя базы данных
                    <input name="db_database" required value="<?= h(old('db', 'database', 'vcms')) ?>">
                </label>
                <label>Пользователь MySQL
                    <input name="db_username" required value="<?= h(old('db', 'username', 'vcms')) ?>">
                </label>
                <label>Пароль MySQL
                    <input name="db_password" type="password" value="<?= h(old('db', 'password', 'secret')) ?>">
                </label>
                <div class="actions">
                    <a class="button secondary" href="install.php?step=1">Назад</a>
                    <button type="submit">Проверить подключение</button>
                </div>
            </form>
        <?php elseif ($step === 3): ?>
            <form method="post">
                <input type="hidden" name="step" value="3">
                <label>Имя администратора
                    <input name="admin_name" required value="<?= h(old('admin', 'name', 'Administrator')) ?>">
                </label>
                <label>Email администратора
                    <input name="admin_email" required type="email" value="<?= h(old('admin', 'email', 'admin@example.test')) ?>">
                </label>
                <label>Пароль администратора
                    <input name="admin_password" required minlength="8" type="password">
                </label>
                <label>Подтверждение пароля
                    <input name="admin_password_confirmation" required minlength="8" type="password">
                </label>
                <div class="actions">
                    <a class="button secondary" href="install.php?step=2">Назад</a>
                    <button type="submit">Далее</button>
                </div>
            </form>
        <?php else: ?>
            <?php $site = $_SESSION['install']['site'] ?? []; $db = $_SESSION['install']['db'] ?? []; $admin = $_SESSION['install']['admin'] ?? []; ?>
            <p>Проверьте данные. После запуска установщик выполнит миграцию <code>database/migrations/0001_create_initial_schema.sql</code>, добавит администратора и сохранит настройки.</p>
            <div class="summary">
                <div><strong>Сайт</strong><span><?= h((string) ($site['name'] ?? '')) ?></span></div>
                <div><strong>URL</strong><span><?= h((string) ($site['url'] ?? '')) ?></span></div>
                <div><strong>База данных</strong><span><?= h((string) ($db['database'] ?? '')) ?> @ <?= h((string) ($db['host'] ?? '')) ?>:<?= h((string) ($db['port'] ?? '')) ?></span></div>
                <div><strong>Администратор</strong><span><?= h((string) ($admin['email'] ?? '')) ?></span></div>
            </div>
            <form method="post">
                <input type="hidden" name="step" value="4">
                <div class="actions">
                    <a class="button secondary" href="install.php?step=3">Назад</a>
                    <button type="submit">Запустить установку</button>
                </div>
            </form>
        <?php endif; ?>
    <?php endif; ?>
</main>
</body>
</html>
