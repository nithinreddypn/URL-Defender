<?php
declare(strict_types=1);

namespace App\Core;

final class Router
{
    /** @var array<int, array{method:string, pattern:string, regex:string, params:string[], handler:callable, middleware:array}> */
    private array $routes = [];

    public function add(string $method, string $pattern, callable $handler, array $middleware = []): void
    {
        $params = [];
        $regex = preg_replace_callback('#\{([a-zA-Z_][a-zA-Z0-9_]*)\}#', function ($m) use (&$params) {
            $params[] = $m[1];
            return '([^/]+)';
        }, $pattern);
        $this->routes[] = [
            'method'     => strtoupper($method),
            'pattern'    => $pattern,
            'regex'      => '#^' . $regex . '$#',
            'params'     => $params,
            'handler'    => $handler,
            'middleware' => $middleware,
        ];
    }

    public function get(string $p, callable $h, array $mw = []): void    { $this->add('GET',    $p, $h, $mw); }
    public function post(string $p, callable $h, array $mw = []): void   { $this->add('POST',   $p, $h, $mw); }
    public function patch(string $p, callable $h, array $mw = []): void  { $this->add('PATCH',  $p, $h, $mw); }
    public function delete(string $p, callable $h, array $mw = []): void { $this->add('DELETE', $p, $h, $mw); }

    public function dispatch(Request $req): void
    {
        // CORS preflight
        if ($req->method === 'OPTIONS') Response::noContent();

        foreach ($this->routes as $r) {
            if ($r['method'] !== $req->method) continue;
            if (!preg_match($r['regex'], $req->path, $m)) continue;
            array_shift($m);
            $req->params = array_combine($r['params'], $m) ?: [];

            foreach ($r['middleware'] as $mw) {
                $mw($req); // middleware may exit with Response::error
            }
            ($r['handler'])($req);
            return;
        }

        // No match — 405 if path matches other method, else 404
        foreach ($this->routes as $r) {
            if (preg_match($r['regex'], $req->path)) Response::error('Method not allowed', 405);
        }
        Response::error('Not found', 404);
    }
}
