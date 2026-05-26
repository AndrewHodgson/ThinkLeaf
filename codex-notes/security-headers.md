# Security Headers

## What was done

Added four production security headers to `next.config.ts` via the Next.js `headers()` config function. The headers apply to all routes (`source: "/(.*)"`) and are served with every response in both development and production.

### Headers added

**`X-Frame-Options: SAMEORIGIN`**
Prevents the app from being embedded in an `<iframe>` on a different origin. Mitigates clickjacking attacks where a malicious page overlays an invisible iframe of the app and tricks users into clicking UI elements.

**`X-Content-Type-Options: nosniff`**
Tells the browser not to MIME-sniff response content types. Prevents a browser from treating a downloaded JSON backup file as executable HTML if Content-Type is somehow wrong.

**`Referrer-Policy: strict-origin-when-cross-origin`**
Sends the full URL as `Referer` only for same-origin requests; for cross-origin requests sends only the origin (not path/query); sends nothing for downgrade (HTTPS → HTTP). This is the modern browser default — no behavioral change in practice, but the header pins the policy explicitly.

**`Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()`**
Disables browser feature access for APIs the app does not use. Clipboard and fullscreen are intentionally left unrestricted — the app uses clipboard paste for images.

## Files touched

| File | Change |
|------|--------|
| `next.config.ts` | Added `securityHeaders` array and `headers()` async function |
| `codex-notes/security-headers.md` | This note |

## Why CSP is deferred

Content-Security-Policy was evaluated and deferred for the following reasons:

1. **Next.js inline scripts**: The App Router embeds inline JavaScript for hydration, RSC payloads, and route prefetching. Without nonce-based middleware (a non-trivial addition), these require `script-src 'unsafe-inline'`, which strips most XSS protection from the policy.

2. **Tiptap inline styles**: Tiptap sets inline `style` attributes for text color, font size, and text decorations on formatted content. These require `style-src 'unsafe-inline'`.

3. **Data URLs for images**: Canvas and document images are stored as `data:` base64 strings. A working policy would need `img-src data: blob: 'self'`.

4. **PDF export popup**: The `exportPageAsPdf` function uses `window.open("", "_blank")` then `document.write`. The main frame's CSP does not propagate to `about:blank` popups opened this way — PDF export is unaffected by CSP regardless of policy.

A CSP that allows `'unsafe-inline'` for both scripts and styles offers minimal XSS protection and increases breakage risk disproportionately for a beta app. The four simple headers above are the right call for now.

**Post-beta CSP path**: Add Next.js middleware to generate per-request nonces, thread the nonce through `<Script>` components (Next.js supports this natively), and tighten `script-src` to `'nonce-{nonce}'`. Tiptap inline styles would still require `style-src 'unsafe-inline'` or a custom approach.

## How to test

1. Start the dev server: `npm run dev`
2. Open DevTools → Network → select any document or API response
3. Check the response headers. The four headers should be present:
   - `x-frame-options: SAMEORIGIN`
   - `x-content-type-options: nosniff`
   - `referrer-policy: strict-origin-when-cross-origin`
   - `permissions-policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()`
4. Verify the app works normally: create a page, paste an image, export to PDF, export JSON backup.
5. Verify `npm run build` completes without errors.

### Verify X-Frame-Options in browser

Create a test HTML file with `<iframe src="http://localhost:3000">` and open it. The browser should refuse to load the iframe and log a console error mentioning `X-Frame-Options`.
