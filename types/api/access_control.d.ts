// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

type AccessControlDecision = {
    allowed: boolean;
    evaluated: boolean;
    reason?: string;
};

type ActionSearchResponse = {
    resource: {
        type: string;
        id: string;
    };
    results: Array<{action: {name: string}}>;
    decisions: Record<string, AccessControlDecision>;
};
