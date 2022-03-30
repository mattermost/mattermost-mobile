// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';

import {Theme} from '@mm-redux/types/theme';
import {useTryCallsFunction} from '@mmproducts/calls/hooks';
import ChannelInfoRow from '@screens/channel_info/channel_info_row';
import Separator from '@screens/channel_info/separator';
import {preventDoubleTap} from '@utils/tap';

type Props = {
    testID: string;
    theme: Theme;
    onPress: (channelId: string) => void;
    enabled: boolean;
}

const EnableDisableCalls = (props: Props) => {
    const {testID, theme, onPress, enabled} = props;

    const [tryOnPress, msgPostfix] = useTryCallsFunction(onPress);
    const handleEnableDisableCalls = useCallback(preventDoubleTap(tryOnPress), [tryOnPress]);

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
