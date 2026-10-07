// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {RenderPermissionAction} from '@constants/access_control';

import {resolveRenderPermission, shouldFetchRenderPermissions} from './render_permissions';

const upload = RenderPermissionAction.UploadFileAttachment;
const denied = {epoch: 5, decisions: {[upload]: {allowed: false, evaluated: true}}};

describe('resolveRenderPermission', () => {
    it('should return the default while ABAC is not enforced, even with a stored deny', () => {
        expect(resolveRenderPermission(false, denied, upload, true)).toBe(true);
    });

    it('should keep rendering the last decision while it is revalidated', () => {
        expect(resolveRenderPermission(true, denied, upload, true)).toBe(false);
        expect(resolveRenderPermission(true, {...denied, expired: true}, upload, true)).toBe(false);
    });

    it('should return the default for a decision the server did not evaluate or did not return', () => {
        const notEvaluated = {epoch: 5, decisions: {[upload]: {allowed: false, evaluated: false}}};
        expect(resolveRenderPermission(true, notEvaluated, upload, true)).toBe(true);
        expect(resolveRenderPermission(true, {epoch: 5, decisions: {}}, upload, false)).toBe(false);
    });
});

describe('shouldFetchRenderPermissions', () => {
    it('should only ask while ABAC is enforced and the stored decisions are missing, expired or predate an invalidation', () => {
        expect(shouldFetchRenderPermissions(false, 5)).toBe(false);
        expect(shouldFetchRenderPermissions(true, 5)).toBe(true);
        expect(shouldFetchRenderPermissions(true, 5, denied)).toBe(false);
        expect(shouldFetchRenderPermissions(true, 5, {...denied, expired: true})).toBe(true);
        expect(shouldFetchRenderPermissions(true, 6, denied)).toBe(true);
    });
});
