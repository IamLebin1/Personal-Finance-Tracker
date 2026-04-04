# Server Setup Guide

This project uses a local Express + SQLite backend in [server.js](server.js).

## 1. Start Server Correctly

Always run the server from the project root folder:

```bash
cd C:\Users\Kelly\WAD_Assignment\Personal-Finance-Tracker
npm run server
```

If you run `npm run server` from `C:\Users\Kelly\WAD_Assignment`, npm may fail with `ENOENT` because no `package.json` exists there.

## 2. Configure API Base URL

Update both files:

- [src/config/Config.tsx](src/config/Config.tsx)
- [src/config/Config.ts](src/config/Config.ts)

Set `serverPath` based on your device type.

### Android Emulator

```ts
serverPath: 'http://10.0.2.2:5000'
```

### Physical Android Device (Wi-Fi)

```ts
serverPath: 'http://YOUR_PC_LAN_IP:5000'
```

Example:

```ts
serverPath: 'http://192.168.100.7:5000'
```

## 3. How to Find Your PC LAN IP (Windows)

Run:

```powershell
Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '169.254*' -and $_.IPAddress -ne '127.0.0.1' } | Select-Object InterfaceAlias,IPAddress
```

Use your active network IP (usually Wi-Fi).

## 4. Physical Device Requirements

- Phone and PC must be on the same Wi-Fi network
- Server must be running on PC
- Firewall must allow Node.js on Private networks
- Rebuild or fully restart app after changing `serverPath`

## 5. Test Backend Quickly

From PC:

```powershell
Invoke-WebRequest -UseBasicParsing "http://localhost:5000/api/transactions" | Select-Object -ExpandProperty Content
```

Expected for fresh DB:

```json
[]
```

## 6. Common Errors

### "Unable to register. Check your connection."

Usually means app cannot reach backend URL.

Check:

- Correct `serverPath` for your device type
- Server process running
- Phone can reach PC IP and port 5000
- No firewall block

### "Cannot GET /"

Normal for this backend. Root route is not defined.
Use API paths like:

- `/api/register`
- `/api/login`
- `/api/transactions`

## 7. Optional: USB Debugging Alternative

If Wi-Fi is unstable, connect phone with USB and run:

```bash
adb reverse tcp:5000 tcp:5000
```

Then use:

```ts
serverPath: 'http://localhost:5000'
```

on the Android device build.
