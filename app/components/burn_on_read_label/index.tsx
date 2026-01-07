// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';

import Tag from '@components/tag';
import {formatTime} from '@utils/datetime';

type Props = {
    durationSeconds: number;
    id?: string;
}

export default function BoRLabel({durationSeconds, id}: Props) {
    const {formatMessage} = useIntl();

    const message = formatMessage({
        id: 'burn_on_read.label.title',
        defaultMessage: 'BURN ON READ ({duration})',
    }, {duration: formatTime(durationSeconds, true)});

    return (
        <Tag
            message={message}
            icon='fire'
            type='dangerDim'
            testID={`${id ? id + '_' : ''}bor_label`}
            size='xs'
        />
    );
}
