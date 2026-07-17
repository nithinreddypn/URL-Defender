<?php
declare(strict_types=1);

/* --------------------------------------------------------------------------
 | Environment detection
 * -------------------------------------------------------------------------- */
if (!function_exists('urlDefenderIsLocalEnvironment')) {
    function urlDefenderIsLocalEnvironment(): bool
    {
        if (PHP_SAPI === 'cli') return true;

        $host = strtolower((string) ($_SERVER['HTTP_HOST'] ?? $_SERVER['SERVER_NAME'] ?? ''));
        $host = trim(explode(':', $host)[0], '[]');
        return in_array($host, ['localhost', '127.0.0.1', '::1'], true);
    }
}

if (!function_exists('urlDefenderDatabaseDebugEnabled')) {
    function urlDefenderDatabaseDebugEnabled(): bool
    {
        if (class_exists('App\\Core\\Env')) {
            return \App\Core\Env::bool('APP_DEBUG', false);
        }
        return filter_var(getenv('APP_DEBUG') ?: false, FILTER_VALIDATE_BOOLEAN);
    }
}

/* --------------------------------------------------------------------------
 | Local configuration (XAMPP)
 * -------------------------------------------------------------------------- */
if (!function_exists('urlDefenderDatabaseSettings')) {
    /** @return array{host:string,port:int,name:string,user:string,password:string} */
    function urlDefenderDatabaseSettings(): array
    {
        $local = [
            'host' => 'localhost',
            'port' => 3306,
            'name' => 'url_defender',
            'user' => 'root',
            'password' => '',
        ];

        /* ------------------------------------------------------------------
         | Production configuration (Hostinger)
         | Replace the HOSTINGER_* placeholders before deployment.
         * ------------------------------------------------------------------ */
        $production = [
            'host' => 'HOSTINGER_DB_HOST',
            'port' => 3306,
            'name' => 'HOSTINGER_DB_NAME',
            'user' => 'HOSTINGER_DB_USER',
            'password' => 'HOSTINGER_DB_PASSWORD',
        ];

        return urlDefenderIsLocalEnvironment() ? $local : $production;
    }
}

/* --------------------------------------------------------------------------
 | Connection creation and error handling
 * -------------------------------------------------------------------------- */
if (!function_exists('urlDefenderDatabaseConnection')) {
    function urlDefenderDatabaseConnection(): PDO
    {
        static $connection = null;
        if ($connection instanceof PDO) return $connection;

        $config = urlDefenderDatabaseSettings();
        $dsn = "mysql:host={$config['host']};port={$config['port']};dbname={$config['name']};charset=utf8mb4";

        try {
            $connection = new PDO($dsn, $config['user'], $config['password'], [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4, SESSION sql_mode='STRICT_ALL_TABLES,NO_ENGINE_SUBSTITUTION'",
            ]);
            return $connection;
        } catch (PDOException $e) {
            // Never send driver, host, credential, or SQL details to the client.
            if (urlDefenderDatabaseDebugEnabled()) {
                error_log('Database connection failed: ' . $e->getMessage());
            }
            if (!headers_sent()) {
                http_response_code(500);
                header('Content-Type: application/json; charset=utf-8');
            }
            echo json_encode([
                'success' => false,
                'message' => 'Unable to connect to the database.',
            ]);
            exit;
        }
    }
}

// `$pdo = require __DIR__ . '/config/database.php';` works, and callers may
// also use urlDefenderDatabaseConnection() to obtain the cached PDO instance.
return urlDefenderDatabaseConnection();
