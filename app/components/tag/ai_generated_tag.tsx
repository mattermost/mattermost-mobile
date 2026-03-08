// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';
import {defineMessage} from 'react-intl';

import Tag from './base_tag';

const aiGeneratedMessage = defineMessage({
    id: 'post_info.ai_generated',
    defaultMessage: 'AI',
});

type AiGeneratedTagProps = Omit<ComponentProps<typeof Tag>, 'message' | 'icon' | 'type'>;

const AiGeneratedTag = ({
    size,
    testID,
}: AiGeneratedTagProps) => {
    return (
        <Tag
            message={aiGeneratedMessage}
            icon='creation-outline'
            testID={testID}
            uppercase={true}
            size={size}
        />
    );
};

export default AiGeneratedTag;
