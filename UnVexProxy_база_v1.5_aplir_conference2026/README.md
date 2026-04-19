# UnVexProxy

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-green.svg)](manifest.json)

A clean, practical browser extension for managinп HTTP proxies without the clutter. "Unvex" means "non-irritating" – no ads, no flashy animations, just straightforward proxy management with unique features like selective mode.

## Features

- **Simple UI**: Clean, distraction-free interface for easy proxy configuration.
- **Protocol Support**: Supports both HTTP(may SOCKS5? but.....)
- **Authentication**: Handles username/password for authenticated proxies.
- **Profile Management**: Save and manage multiple proxy profiles.
- **Selective Mode**: Apply proxy only to specific websites (e.g., YouTube, ChatGPT, Instagram) or custom sites.
- **IP Testing**: Built-in IP checker to verify proxy connection.
- **Cross-Browser**: Compatible with Chrome, Microsoft Edge, and Yandex Browser.
- **No Ads**: Completely ad-free experience.

## Installation
Just download the .crx file and add the extension to your browser via extensions (the path depends on your browser)

### From Source (Developer Mode)

1. Clone or download this repository.
2. Open your browser (Chrome, Edge, or Yandex Browser).
3. Navigate to the extensions page:
   - Chrome: `chrome://extensions/`
   - Edge: `edge://extensions/`
   - Yandex: `browser://extensions/`
4. Enable "Developer mode" (toggle in the top-right corner).
5. Click "Load unpacked" and select the project directory (`UnVexProxy_v1.1`).
6. The extension should now be installed and visible in your browser toolbar.

### Permissions Required

The extension requires the following permissions:
- `proxy`: To configure browser proxy settings.
- `storage`: To save profiles and settings locally.
- `webRequest`: To handle authentication and request blocking.
- `tabs`: To interact with browser tabs.
- `scripting`: To execute scripts for IP testing.

## Usage

### Basic Proxy Setup

1. Click the UnVexProxy icon in your browser toolbar to open the popup.
2. Enter proxy details: Host/IP, Port, Username, Password(when working with a proxy without authorization, connection problems may occur. It is also dangerous to use unsolicited proxy servers. Therefore, we recommend using only servers with a password, and our client works well with such addresses.).
3. Click "Connect" to apply the proxy immediately, or "Save Profile" to store it for later use.

### Managing Profiles

- Saved profiles appear in the list below the form.
- Click "Connect" next to a profile to switch to it.
- Click "Delete" to remove a profile.

### Selective Mode

1. Click "Settings" in the popup to open the settings page.
2. Toggle "Selective Mode" on.
3. Choose popular sites (YouTube, ChatGPT, Instagram) or add custom sites(enter the website address in the format www.address.domain and click add).
4. The proxy will now only apply to selected websites, bypassing others for faster browsing.

### Testing Connection

- Click "Check IP" in the popup to verify your current IP address through the proxy.
- Results show whether the proxy is active and your IP.

### Toggling Proxy

- Use the toggle switch in the popup to quickly enable/disable the proxy.
- The extension remembers your last active profile.

## Configuration

### Settings Page

Access via "Settings" button in the popup. Options include:
- **Selective Mode**: Enable/disable proxy for specific sites.
- **Popular Sites**: Quick toggles for common websites.
- **Custom Sites**: Add your own list of sites for selective proxying.

### Storage

All data (profiles, settings) is stored locally in `chrome.storage.local`. No data is sent to external servers.

## Browser Compatibility

- Google Chrome (Manifest V3)
- Microsoft Edge (Manifest V3)
- Yandex Browser (Manifest V3)

## Development

### Project Structure

```
UnVexProxy/
├── manifest.json          # Extension manifest
├── background.js          # Background service worker
├── popup.html             # Popup UI
├── popup.js               # Popup logic
├── popup.css              # Popup styles
├── settings.html          # Settings page
├── settings.js            # Settings logic
├── icons/                 # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   ├── icon128.png
│   └── geer_wheel.svg
└── README.md
```




## Known Limitations

The initial version of the extension(v1.0) contained the option to choose between http and socks5 protocols. Unfortunately, using socks5 is not possible, because chrome.WebRequest.onAuthRequired only works for HTTP proxies. We will find a solution to this problem in the future))

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you encounter issues or have questions:
- Check the browser console for errors.
- Ensure all permissions are granted.
- Verify proxy server details are correct.

For feature requests or bug reports, please open an issue on GitHub.

---

**UnVexProxy** – Keep it simple, keep it proxying.
