// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Clipboard from '@react-native-clipboard/clipboard';
import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';

import OptionItem from '@components/option_item';
import SlideUpPanelItem from '@components/slide_up_panel_item';
import {CHANNEL_INFO} from '@constants/screens';
import {SNACK_BAR_TYPE} from '@constants/snack_bar';
import {useServerUrl} from '@context/server';
import {dismissBottomSheet} from '@screens/navigation';
import {showSnackBar} from '@utils/snack_bar';

type Props = {
    channelName?: string;
    teamName?: string;
    showAsLabel?: boolean;
    testID?: string;
}

const CopyChannelLinkOption = ({channelName, teamName, showAsLabel, testID}: Props) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();

    const onCopyLink = useCallback(async () => {
        Clipboard.setString(`${serverUrl}/${teamName}/channels/${channelName}`);
        await dismissBottomSheet();
        showSnackBar({barType: SNACK_BAR_TYPE.LINK_COPIED, sourceScreen: CHANNEL_INFO});
    }, [channelName, teamName, serverUrl]);

    if (showAsLabel) {
        return (
            <SlideUpPanelItem
                onPress={onCopyLink}
                text={intl.formatMessage({id: 'channel_info.copy_link', defaultMessage: 'Copy Link'})}
                leftIcon='link-variant'
                testID={testID}
            />
        );
    }

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
