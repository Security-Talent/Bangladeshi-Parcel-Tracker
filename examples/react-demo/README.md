# React package demo

This demo calls the local `bangladeshi-parcel-tracker` package from a small server and displays the normalized result in React. The browser never imports the Node package directly; the package makes courier requests from the server.

## Install

From this folder:

```sh
npm install
```

The package dependency points to `../../packages/bangladeshi-parcel-tracker`, so the demo uses the workspace code being edited rather than an older registry install.

## Supported couriers

| Courier | Description |
| --- | --- |
| RedX | Leading courier service in Bangladesh |
| Steadfast | Reliable delivery solutions |
| Pathao | Fast and efficient courier service |
| Rokomari | Book and product delivery specialist |
| Sundarban | Comprehensive logistics and courier solutions |

## Run

Start the API in one terminal (uses Node.js built-ins plus the local package):

```sh
npm run server
```

Start Vite in another terminal:

```sh
npm run dev
```

Open the local URL Vite prints. The React form calls `POST /api/track`; the API calls the library's `track()` method. The green connection indicator confirms that the local server loaded the package and can enumerate its courier exports. A parcel lookup makes a real request to the selected courier.

Use only tracking details you are authorized to access. The demo does not save form data, but courier requests necessarily send required values to the selected provider. Provider access and response formats can change; `UNKNOWN` status or upstream errors do not necessarily mean the package API itself failed.

## Build

```sh
npm run build
```

This is a local demonstration, not a production deployment. The demo API binds to loopback and Vite proxies `/api` to it during development.
