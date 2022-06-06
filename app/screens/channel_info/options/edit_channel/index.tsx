// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {Platform} from 'react-native';

import OptionItem from '@components/option_item';
import {Screens} from '@constants';
import {goToScreen} from '@screens/navigation';
import {preventDoubleTap} from '@utils/tap';

type Props = {
    channelId: string;
}

const EditChannel = ({channelId}: Props) => {
    const {formatMessage} = useIntl();
    const title = formatMessage({id: 'screens.channel_edit', defaultMessage: 'Edit Channel'});

    const goToEditChannel = preventDoubleTap(async () => {
        goToScreen(Screens.CREATE_OR_EDIT_CHANNEL, title, {channelId, isModal: false});
    });

    return (
        <OptionItem
            action={goToEditChannel}
            label={title}
            icon='pencil-outline'
            type={Platform.select({ios: 'arrow', default: 'default'})}
        />
    );
};

export default EditChannel;
