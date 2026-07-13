# MediaSFU MCP Production Server

Deploy the hosted MCP endpoints as a standalone service. Do not import the server into MediaBack or give it direct database, cookie, filesystem, or MediaBack environment access. Authenticated actions call MediaBack only through fixed HTTPS routes.

## Production topology

- Public read-only MCP URL: `https://mcp.mediasfu.com/mcp`
- Disposable-key action MCP URL: `https://mcp.mediasfu.com/mcp/actions`
- Public health URL: `https://mcp.mediasfu.com/healthz`
- Internal listener: `127.0.0.1:3333`
- Install root: `/MCPServer`
- Service account: `mediasfu-mcp`
- Systemd unit: `server/systemd/mediasfu-mcp.service`
- Environment: `/etc/mediasfu-mcp.env`, mode `0640`, owned by `root:mediasfu-mcp`
- Nginx: TLS termination and proxying; port 3333 must never be opened in UFW or the cloud firewall

Releases should be immutable directories below `/MCPServer/releases`. Change `/MCPServer/current` atomically and restart the service. This keeps deployment and rollback independent from MediaBack.

## Security invariants

- Keep `MCP_ALLOW_LOCAL_SIDE_EFFECTS` and `MCP_INCLUDE_INTERNAL_TOOLS` unset.
- Set `MCP_ALLOW_UNAUTHENTICATED_PUBLIC=1` intentionally; `/mcp` is permanently read-only.
- Require `Authorization: Bearer <username>:<disposableKey>` on `/mcp/actions`.
- Validate every new action session through MediaBack and expose only tools allowed by the key scopes.
- Bind only to `127.0.0.1` and allow only `mcp.mediasfu.com` as the Host header.
- Use the dedicated unprivileged system user and the hardened systemd unit.
- Never log credentials. Keep action credentials in memory only for the lifetime of their MCP session.
- Keep HTTP cleartext closed; only the ACME challenge path is reachable before TLS.

## Environment

Start with `server/env.production.example`:

```bash
sudo install -o root -g mediasfu-mcp -m 0640 server/env.production.example /etc/mediasfu-mcp.env
```

The service has no shared action token. Each action client supplies its own scoped, expiring MediaSFU disposable key.

## Two-phase Nginx and Certbot setup

First add the DNS record:

```text
Type: A
Host/name: mcp
Value: <public-server-ip>
TTL: 300 (or provider default)
```

Confirm public DNS from at least two resolvers:

```bash
dig +short mcp.mediasfu.com A @1.1.1.1
dig +short mcp.mediasfu.com A @8.8.8.8
```

Before the record exists, enable only `server/nginx/mcp.mediasfu.com.http.conf.example`. It serves `/.well-known/acme-challenge/` and returns `404` everywhere else.

After both resolvers return the intended public server IP, issue the certificate:

```bash
sudo certbot certonly --webroot -w /var/www/certbot -d mcp.mediasfu.com --agree-tos --no-eff-email --email info@mediasfu.com
```

Then install `server/nginx/mcp.mediasfu.com.conf.example`, validate, and reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
sudo certbot renew --dry-run
```

Never use an expired wildcard certificate as a shortcut.

## Validation

```bash
npm run release:check
sudo systemctl status mediasfu-mcp --no-pager
sudo journalctl -u mediasfu-mcp -n 100 --no-pager
sudo ss -lntp | grep 3333
sudo ufw status | grep 3333 || echo "port 3333 is not public"
curl https://mcp.mediasfu.com/healthz
```

Expected health properties include `publicReadOnly: true`, `publicAuthRequired: false`, `actionAuthRequired: true`, `sdkCount: 10`, and `publicToolCount: 138`. Public MCP initialization succeeds without credentials; action initialization without the exact disposable-key bearer pair returns `401`.

## Rollback

List releases and point `current` to the previous known-good directory:

```bash
sudo find /MCPServer/releases -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort
sudo ln -sfn /MCPServer/releases/PREVIOUS_RELEASE /MCPServer/current
sudo systemctl restart mediasfu-mcp
curl -H 'Host: mcp.mediasfu.com' http://127.0.0.1:3333/healthz
```

Do not delete the previous release until the new release has operated successfully through the desired observation window.
