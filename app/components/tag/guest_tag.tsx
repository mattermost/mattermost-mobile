// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';
import {defineMessage} from 'react-intl';

import Tag from './base_tag';

const botMessage = defineMessage({
    id: 'post_info.guest',
    defaultMessage: 'Guest',
});

type GuestTagProps = Omit<ComponentProps<typeof Tag>, 'message' | 'icon' | 'type'>;

const GuestTag = ({
    testID,
    size,
}: GuestTagProps) => {
    return (
        <Tag
            message={botMessage}
            testID={testID}
            uppercase={true}
            size={size}
        />
    );
};

export default GuestTag;
