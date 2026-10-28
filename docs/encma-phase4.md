# ENCMA Phase 4: permanent deletion and voice messages

Phase 4 keeps the ENCMA Android identity and the per-app WireGuard gate unchanged. It adds permanent deletion for supported Mattermost channels and Android voice recordings that use the existing draft/file-upload flow.

No separate backend URL, API contract, credentials, or custom-server access was supplied. **No live custom-server integration is configured or claimed in this phase.** The app continues to use the Mattermost server selected during the existing login flow.

## Permanent channel deletion

### Supported behavior

The **Delete Channel Permanently** Channel Settings action is separate from **Archive Channel**. Archiving and restoring retain their existing behavior.

For a non-default public or private channel, the app calls the supported Mattermost endpoint with the current session:

```text
DELETE /api/v4/channels/{channel_id}?permanent=true
```

The request permanently deletes the channel and its history for all participants. This is not a local hide, leave, or restorable archive. Mattermost documents the operation as unrecoverable except by restoring a database backup.

The mobile option uses the existing applicable permission gate:

- Public channels: `delete_public_channel`
- Private channels: `delete_private_channel`
- System administrators remain subject to the server's authorization rules

The server remains authoritative. A visible option does not prove that permanent deletion is enabled; the app shows an error if the server refuses the request. Local channel cleanup starts only after the server confirms deletion.

The default channel and direct/group messages are also guarded in the remote action, independently of the UI.

### Required server configuration

A system administrator must explicitly enable API channel deletion. It is disabled by default.

In `config.json`, under `ServiceSettings`:

```json
{
    "ServiceSettings": {
        "EnableAPIChannelDeletion": true
    }
}
```

The equivalent Mattermost environment setting is:

```text
MM_SERVICESETTINGS_ENABLEAPICHANNELDELETION=true
```

Apply configuration through the deployment's normal reviewed configuration process and restart/reload the server as required by that deployment. Do not place administrator credentials or session tokens in the mobile repository.

Before enabling this in production:

1. Take a database backup and test its restoration procedure.
2. Validate permanent deletion on a staging server with disposable public and private channels.
3. Review role assignments and grant deletion permission only to intended roles.
4. Review retention, compliance-export, audit, and legal-hold requirements with the server owner. Do not assume that mobile deletion replaces those controls.
5. Verify the behavior for other connected participants and clients, not only for the administrator initiating deletion.

### Direct and group conversation limitation

Mattermost does not expose supported permanent deletion for DM/GM conversations through this endpoint. Upstream request [mattermost/mattermost#27489](https://github.com/mattermost/mattermost/issues/27489) is closed as **Not planned**, and the inspected implementation attempts had not established supported API behavior.

Accordingly, ENCMA does **not** show or simulate permanent deletion for DMs or GMs. Leaving, hiding, or deleting only local records would not satisfy permanent deletion for everyone.

Supporting that operation requires a separately designed and reviewed server/plugin capability with explicit authorization and complete server-side cascade semantics, followed by a documented mobile API contract. Until then, permanent deletion for every conversation type is not available.

## Android voice messages

The Android draft quick actions include a microphone control when file uploads are allowed and the draft has not reached its file limit.

Recording behavior:

- Requests microphone permission at runtime; `RECORD_AUDIO` was already declared for Android calling functionality.
- Records AAC in an M4A container (`audio/mp4`), mono at 44.1 kHz and a 64 kbps target bitrate.
- Provides a timer, cancellation, and an explicit **Stop & attach** action.
- Does not intentionally record in the background. Backgrounding or cancelling discards the temporary recording.
- Verifies a successful native stop and a nonempty local file before creating an attachment.
- Hands the attachment to the existing draft upload manager. Normal channel permissions, file-count/size validation, upload progress, errors, retries, draft removal, and the Send button still apply.
- Uses Mattermost's existing file upload/post `file_ids` behavior and existing audio playback; it does not invent a voice post type or a custom backend endpoint.

The server must permit ordinary file uploads for the user and channel. No special voice-message endpoint is required.

A successful source build or mocked test does not validate microphone hardware or server acceptance. Device verification must cover permission grant/denial, recording and cancellation, backgrounding, upload completion, playback by another participant, and behavior at server file-size/file-count limits.

## Operational verification still required

No Android device, production Mattermost server, or separate custom backend was available in the development environment. The following remain operational acceptance tasks:

- Permanent deletion with `EnableAPIChannelDeletion` both disabled and enabled.
- Public/private permission denial and success for multiple participants.
- Confirmation that DM/GM permanent deletion is not offered.
- Real microphone recording, draft upload, sending, and playback.
- Existing ENCMA SSO, WireGuard tunnel/network traversal, Firebase registration, and push delivery checks from the earlier phases.
