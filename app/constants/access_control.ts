// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Action names registered by the server for render-time decisions (renderableABACActions,
// server/channels/app/access_control_decision.go). Adding an action here is all the client needs:
// decisions are requested in discovery mode, so every registered action comes back in one request.
export const RenderPermissionAction = {
    ChannelManagementAccess: 'channel_management_access',
    ChannelReadAccess: 'channel_read_access',
    ChannelWriteAccess: 'channel_write_access',
    UploadFileAttachment: 'upload_file_attachment',
} as const;
export type RenderPermissionActionName = typeof RenderPermissionAction[keyof typeof RenderPermissionAction];

export const RENDER_PERMISSION_RESOURCE_CHANNEL = 'channel';

// The permission policy action the server sanitizes post file metadata under, which the client acts on
// through redaction rather than a render decision.
export const DOWNLOAD_FILE_ATTACHMENT_ACTION = 'download_file_attachment';
