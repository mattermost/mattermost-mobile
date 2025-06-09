// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {MessageDescriptor} from 'react-intl';

export type TabDefinition<T extends string> = {
    name: MessageDescriptor;
    id: T;
    requiresUserAttention?: boolean;
    count?: number;
}
