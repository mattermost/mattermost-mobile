// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Clipboard from '@react-native-community/clipboard';
import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';

import OptionItem from '@components/option_item';
import {useServerUrl} from '@context/server';

type Props = {
    channelName?: string;
    teamName?: string;
    testID?: string;
}

const CopyChannelLinkOption = ({channelName, teamName, testID}: Props) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();

    const onCopyLink = useCallback(() => {
        Clipboard.setString(`${serverUrl}/${teamName}/channels/${channelName}`);

        // TODO: Maybe show a toast?
    }, [channelName, teamName, serverUrl]);

    return (
        <OptionItem
            action={onCopyLink}
            label={intl.formatMessage({id: 'channel_info.copy_link', defaultMessage: 'Copy Link'})}
            icon='link-variant'
            type='default'
            testID={testID}
        />
    );
};

export default CopyChannelLinkOption;
