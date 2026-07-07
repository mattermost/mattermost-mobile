// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

type SAField = {
    name: string;
    type: string;
    ttl_seconds: number;
    grace_period_seconds: number;
};

// Shape of the `property_field` payload delivered by the property_field_* websocket events.
type SAPropertyField = {
    name: string;
    type: string;
    delete_at: number;
    attrs: {
        enabled: boolean;
        platforms: string[];
        ttl_seconds: number;
        grace_period_seconds: number;
    };
};
