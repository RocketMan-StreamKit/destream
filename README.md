# Destream

Destream donation integration for StreamKit+.

- **Addon id:** `destream`
- **Type:** `platform.donation`
- **Minimum StreamKit+:** `1.0.33`

## Setup

1. Go to https://destream.net/overlays and create an overlay widget.
2. Copy the overlay widget URL (starts with `https://overlays.destream.net/...`).
3. Paste the URL into the addon settings in StreamKit+ and click **Connect**.

## Development

1. Open **Settings** in StreamKit+ and install this folder.
2. Approve the requested permissions.
3. Enable the addon and configure settings.

## Build

```bash
npm install
npm run build
```

Install the `dist/` folder in StreamKit+ (contains `manifest.json`, worker, and assets).

## Release

Push to the `main` branch or run the **Release addon** GitHub Action manually.
Each push reads `version` from `manifest.json` and creates a GitHub Release when `v{version}` does not exist yet.

Then uploads `main.zip`, `manifest.json`, and the icon.

Docs: [StreamKit+ addon developer docs](https://rocketman-streamkit.github.io/types/)
