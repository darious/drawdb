# Running drawDB with Docker

The repo ships a multi-stage `Dockerfile` (Node build stage → Nginx serving stage).

## Build & run

```bash
# Build
docker build -t drawdb .

# Run (serves on http://localhost:8080)
docker rm -f drawdb 2>/dev/null; docker run -d --name drawdb -p 8080:80 drawdb
```

Then open <http://localhost:8080>.

## Behind a corporate proxy (Zscaler etc.)

On a network with a TLS-intercepting proxy, the container doesn't trust the
proxy's root CA, so `npm ci` fails during the build with errors like
`UNABLE_TO_GET_ISSUER_CERT_LOCALLY` (often surfacing later as `vite: not found`).

The `Dockerfile` accepts the CA as an optional BuildKit **secret** (`id=node_ca`)
and sets `NODE_EXTRA_CA_CERTS` for the install step. Provide it like so:

```bash
# Build with the corporate CA trusted during npm ci
docker build --secret id=node_ca,src=./zscaler-root.pem -t drawdb .

# Run
docker rm -f drawdb 2>/dev/null; docker run -d --name drawdb -p 8080:80 drawdb
```

BuildKit is enabled by default in modern Docker / Rancher Desktop, so the
`--secret` flag works as-is. The secret is mounted only for the install step and
is **not** baked into any image layer.

### Getting `zscaler-root.pem`

The cert is machine-/network-specific and is **gitignored** (never committed).
Export your proxy's root CA from the macOS keychain, for example:

```bash
security find-certificate -a -c "Zscaler Root CA" -p \
  /Library/Keychains/System.keychain > zscaler-root.pem
```

(Adjust the certificate name to match your environment.)

## Troubleshooting

- **`vite: not found` during build** — `npm ci` aborted silently due to the proxy
  CA issue above. Build with the `--secret` flag.
- **dockerd OOM-killed during minification** — the build bundles a large app.
  Give the Docker VM more memory (Rancher Desktop: ~12 GB / 4 CPU recommended),
  e.g. `rdctl set --virtual-machine.memory-in-gb 12 --virtual-machine.number-cpus 4`.

## Useful commands

```bash
docker logs -f drawdb        # tail logs
docker rm -f drawdb          # stop & remove the container
```
