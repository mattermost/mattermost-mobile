// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Mirrors server/public/model/access_control_decision.go.

type RenderPermissionDecision = {
    allowed: boolean;

    // False when the server could not evaluate the action; the caller's default applies.
    evaluated: boolean;

    // Set only when a fail-closed action was denied because evaluation failed, never on a policy deny.
    reason?: string;
};

type ActionSearchResource = {
    type: string;
    id: string;
};

type ActionSearchRequest = {
    resource: ActionSearchResource;

    // Omitted for discovery mode: the server evaluates every action it registers for the resource type.
    actions?: string[];
};

type ActionSearchResponse = {
    resource: ActionSearchResource;

    // Permitted actions only, in AuthZEN form.
    results: Array<{action: {name: string}}>;

    // Every evaluated action, allowed or not.
    decisions: Record<string, RenderPermissionDecision>;
};
