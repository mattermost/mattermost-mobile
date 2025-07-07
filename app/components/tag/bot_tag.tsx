// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';
import {defineMessage} from 'react-intl';

import Tag from './base_tag';

const botMessage = defineMessage({
    id: 'post_info.bot',
    defaultMessage: 'Bot',
});

type BotTagProps = Omit<ComponentProps<typeof Tag>, 'message' | 'icon' | 'type'>;

const BotTag = ({
    size,
    testID,
}: BotTagProps) => {
    return (
        <Tag
            message={botMessage}
            testID={testID}
            uppercase={true}
            size={size}
        />
    );
};

export default BotTag;
