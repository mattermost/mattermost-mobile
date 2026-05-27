// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';
import {defineMessage} from 'react-intl';

import Tag from './base_tag';

const agentMessage = defineMessage({
    id: 'post_info.agent',
    defaultMessage: 'Agent',
});

type AgentTagProps = Omit<ComponentProps<typeof Tag>, 'message' | 'icon' | 'type'>;

const AgentTag = ({
    size,
    testID,
}: AgentTagProps) => {
    return (
        <Tag
            message={agentMessage}
            testID={testID}
            uppercase={true}
            size={size}
        />
    );
};

export default AgentTag;
