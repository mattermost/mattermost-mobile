// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';

import {Theme} from '@mm-redux/types/theme';
import ChannelInfoRow from '@screens/channel_info/channel_info_row';
import Separator from '@screens/channel_info/separator';
import {t} from '@utils/i18n';
import {preventDoubleTap} from '@utils/tap';

type Props = {
    testID?: string;
    theme: Theme;
    currentChannelId: string;
    joinCall: (channelId: string) => void;
    canStartCall: boolean;
}

const StartCall = (props: Props) => {
    const {testID, canStartCall, theme, joinCall, currentChannelId} = props;

    const handleStartCall = useCallback(preventDoubleTap(() => {
        joinCall(currentChannelId);
    }), [joinCall, currentChannelId]);

    if (!canStartCall) {
        return null;
    }

    return (
        <>
            <Separator theme={theme}/>
            <ChannelInfoRow
                testID={testID}
                action={handleStartCall}
                defaultMessage='Start Call'
                icon='phone'
                textId={t('mobile.channel_info.start_call')}
                theme={theme}
            />
        </>
    );
};

export default StartCall;
