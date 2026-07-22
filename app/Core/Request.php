<?php
declare(strict_types=1);

namespace App\Core;

final class Request
{
    public string $method;
    public string $path;
    public array  $query;
    public array  $body;
    public array  $headers;
    public array  $params = []; // set by router
    public ?array $user   = null; // set by AuthMiddleware

    public function __construct()
    {
        $this->method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
        $uri  = $_SERVER['REQUEST_URI'] ?? '/';
        $this->path  = rtrim(parse_url($uri, PHP_URL_PATH) ?: '/', '/') ?: '/';
        $this->query = $_GET ?? [];

        $raw = file_get_contents('php://input') ?: '';
        $this->body = [];
        if ($raw !== '') {
            $json = json_decode($raw, true);
            if (is_array($json)) $this->body = $json;
        }
        if (empty($this->body) && !empty($_POST)) $this->body = $_POST;

        $this->headers = [];
        foreach ($_SERVER as $k => $v) {
            if (str_starts_with($k, 'HTTP_')) {
                $name = strtolower(str_replace('_', '-', substr($k, 5)));
                $this->headers[$name] = $v;
            }
        }
        if (isset($_SERVER['CONTENT_TYPE']))   $this->headers['content-type']   = $_SERVER['CONTENT_TYPE'];
        if (isset($_SERVER['CONTENT_LENGTH'])) $this->headers['content-length'] = $_SERVER['CONTENT_LENGTH'];
    }

    public function header(string $name): ?string
    {
        return $this->headers[strtolower($name)] ?? null;
    }

    public function bearer(): ?string
    {
        $h = $this->header('authorization');
        if (!$h) return null;
        if (stripos($h, 'Bearer ') === 0) return substr($h, 7);
        return null;
    }

    public function ip(): string
    {
        return $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    }

    public function ua(): string
    {
        return substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 255);
    }
}
