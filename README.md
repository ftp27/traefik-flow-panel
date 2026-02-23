# Traefik Flow Panel

Custom Grafana panel for visualizing Traefik router → Traefik → service flow as a Sankey-style diagram.

![Demo](https://github.com/ftp27/traefik-flow-panel/blob/main/static/demo.gif)

## Prerequisites
- Node.js 18+
- npm
- Grafana 9.5+ (Grafana 9 compatible build)

## Options
- `Router label`: label name for router (`router`)
- `Service label`: label name for service (`service`)
- `Code label`: label name for status code (`code`)
- `Traefik logo URL`: optional image URL for center logo (leave empty to use inline SVG)

## Data Expectations
- Metric: `traefik_router_requests_total`
- Labels: `router`, `service`, `code`

## Data Frame Schema
This panel expects time series data that Grafana converts into data frames with:
- **Fields**: at least one `number` field containing request counts.
- **Labels** (per field):
  - `router` (string, required)
  - `service` (string, required)
  - `code` (string, required; HTTP status code)

**Notes**
- Each unique `(router, service, code)` label set is aggregated into router/service totals.
- Status codes are bucketed into:
  - `200–399` (OK)
  - `400–499` (Client error)
  - `500–599` (Server error)

## Example Query
```promql
rate(traefik_router_requests_total[1h])
```

## Install & Run (Local Grafana)
1. Install deps:
   ```bash
   npm install
   ```

2. Build the plugin:
   ```bash
   npm run build
   ```

3. Copy the plugin to Grafana plugins folder:
   ```bash
   # Example path, adjust to your Grafana install
   cp -R ./dist /var/lib/grafana/plugins/traefik-flow-panel
   ```

4. Allow unsigned plugin (dev only):
   ```bash
   export GF_PLUGINS_ALLOW_LOADING_UNSIGNED_PLUGINS=traefik-flow-panel
   ```

5. Start Grafana and add the panel.

## Dev Mode (Grafana + hot reload)
```bash
npm run dev
```
This runs `grafana-toolkit` dev server. Point Grafana to the generated plugin output.

## Quick Preview (No Grafana)
```bash
npm run harness
```
Opens a local Vite dev server with mocked data.
