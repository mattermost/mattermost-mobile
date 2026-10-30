# ENCMA per-server CA import

ENCMA Android can import a public CA certificate on the same screen used to enter a server URL. This replaces the earlier single-embedded-CA proposal: no customer certificate or private key is committed to the repository or APK.

## User behavior

1. Enter the server URL and choose **Import CA certificate**.
2. Select one public root/issuing CA in PEM or DER form, commonly named `cert.crt` or `cert.pem`.
3. The selected filename and associated hostname appear on the form. The same control replaces the certificate, and the adjacent remove control deletes it.
4. Connect normally. If the server redirects to another hostname, ENCMA moves the certificate's management association to that hostname after validation succeeds.

Imports are optional. Servers using publicly trusted certificates continue to work without a file. A server removal deletes its associated CA; ordinary logout preserves it for the next login.

## Validation and storage

The native importer accepts only a file that:

- is no larger than 64 KiB;
- contains exactly one X.509 certificate in PEM or DER form;
- has CA basic constraints (a server/leaf certificate is rejected); and
- is currently valid.

Only the normalized certificate bytes are written, in DER form, to ENCMA's private internal storage. The original document is not copied, so any unrelated PEM blocks it may contain are not persisted. The original filename, hostname association, subject, expiry, and SHA-256 fingerprint are metadata only; no private key is requested or stored.

Certificates are associated with hostnames for replacement, redirect handling, and removal. ENCMA's trust store is application-scoped: imported CAs are additional trust anchors inside ENCMA, not only for one HTTP client, so calls and background notification data requests can use the same private PKI. They are **not** installed into Android's system/user CA store and are unavailable to other apps.

## TLS coverage and security

The app-private store supplements the existing platform system/user trust managers. It does not enable the network library's self-signed-certificate bypass and does not replace or disable hostname verification.

The native integration covers:

- the initial generic HEAD/server redirect probe;
- Mattermost API clients and their WebSocket clients;
- React Native OkHttp traffic, including React Native WebSockets and Expo image loading;
- LiveKit signaling that uses React Native's WebSocket implementation; and
- background push-notification data requests made through Mattermost's native API client.

Existing trust managers consult the current private store, so an import or removal does not require rebuilding every client or restarting the app. Damaged or expired stored certificates are not used as trust anchors.

External-browser/Chrome SSO pages are outside ENCMA's process and do **not** use this private store. Such SSO deployments still need a certificate trusted by the browser (normally a publicly trusted or device-installed CA). WebRTC media transport has its own DTLS behavior and is not made less strict by this feature.

No Mattermost backend setting is required for the import itself. The server still needs a correctly configured certificate chain and a certificate SAN matching its HTTPS/WSS hostname.

## Regression coverage

JavaScript tests cover the server-form controls, native bridge arguments, safe cleanup when the Android module is absent, and preservation/removal behavior during logout/server removal. Native unit tests use public test-only certificates to cover PEM/DER parsing, leaf and bundle rejection, dynamic import/removal, and preservation of platform trust.

The exact expanded CI JavaScript selection passed locally with **44 suites, 543 passing tests, 2 pre-existing skipped tests, and 2 passing snapshots**. Full ESLint, TypeScript, workflow YAML, and diff whitespace checks also passed. This remains a focused selection, not a claim that the repository's entire Jest suite is green. Native Android test/build results are tracked separately in CI.

## Device acceptance required

Build and unit-test success does not prove interoperability with a particular private PKI. On a device without the private CA manually installed in Android, verify:

1. The correct imported CA allows server probe, login, API loading, uploads/images, and WebSocket updates.
2. Removing the CA or choosing an unrelated CA makes the private-server TLS connection fail; a valid public server still works.
3. A certificate with the wrong hostname/SAN still fails even though its issuing CA is imported.
4. Calls connect with the same private PKI, including LiveKit signaling when that transport is enabled.
5. A background push notification can fetch its Mattermost message details through the imported CA and the required WireGuard route.
6. External-browser SSO is tested separately if used; do not treat it as covered by the in-app store.
