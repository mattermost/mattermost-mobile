// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useSelector} from 'react-redux';

import {getCurrentChannel} from '@mm-redux/selectors/entities/channels';
import {Theme} from '@mm-redux/types/theme';
import {useTryCallsFunction} from '@mmproducts/calls/hooks';
import {disableChannelCalls, enableChannelCalls} from '@mmproducts/calls/store/actions/calls';
import ChannelInfoRow from '@screens/channel_info/channel_info_row';
import Separator from '@screens/channel_info/separator';
import {preventDoubleTap} from '@utils/tap';

type Props = {
    testID: string;
    theme: Theme;
    enabled: boolean;
}

const EnableDisableCalls = ({testID, theme, enabled}: Props) => {
    const currentChannel = useSelector(getCurrentChannel);

    const toggleCalls = useCallback(() => {
        if (enabled) {
            disableChannelCalls(currentChannel.id);
        } else {
            enableChannelCalls(currentChannel.id);
        }
    }, [enabled, currentChannel.id]);

    const [tryOnPress, msgPostfix] = useTryCallsFunction(toggleCalls);
    const handleEnableDisableCalls = preventDoubleTap(tryOnPress);

    return (
        <>
            <Separator theme={theme}/>
            <ChannelInfoRow
                testID={testID}
                action={handleEnableDisableCalls}
                defaultMessage={(enabled ? 'Disable Calls' : 'Enable Calls') + msgPostfix}
                icon='phone-outline'
                theme={theme}
                rightArrow={false}
            />
        </>
    );
};

export default EnableDisableCalls;
