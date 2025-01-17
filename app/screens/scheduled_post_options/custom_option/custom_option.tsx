// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {View} from 'react-native';

import PickerOption from '@screens/post_priority_picker/components/picker_option';

export function ScheduledPostCustomOption() {
    const intl = useIntl();

    return (
        <View>
            <PickerOption
                key='scheduledPostOptionCustom'
                label={intl.formatMessage({id: 'scheduled_post.picker.custom', defaultMessage: 'Custom Time'})}
            />
        </View>
    );
}
