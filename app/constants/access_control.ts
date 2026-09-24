// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Action names registered by the server for render-time decisions (renderableABACActions,
// server/channels/app/access_control_decision.go). Adding an action here is all the client needs:
// decisions are requested in discovery mode, so every registered action comes back in one request.
export const RenderPermissionAction = {
    UploadFileAttachment: 'upload_file_attachment',
} as const;
export type RenderPermissionActionName = typeof RenderPermissionAction[keyof typeof RenderPermissionAction];

export const RENDER_PERMISSION_RESOURCE_CHANNEL = 'channel';
