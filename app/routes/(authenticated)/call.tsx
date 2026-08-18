// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import RNUtils from '@mattermost/rnutils';
import {useIntl} from 'react-intl';

import CallScreen from '@calls/screens/call_screen';
import {setPendingCallScreenChannelId} from '@calls/state';
import {useTheme} from '@context/theme';
import useDidMount from '@hooks/did_mount';
import {getHeaderOptions, useNavigationHeader} from '@hooks/navigation_header';

export default function CallRoute() {
    const intl = useIntl();
    const theme = useTheme();

    useDidMount(() => {
        // We're here now, so the call's floating bar no longer needs to be held back (see
        // useNavigationHeaderCallButtonForDM); it belongs on screen again once this view is collapsed.
        setPendingCallScreenChannelId(null);
        RNUtils.unlockOrientation();

        return () => {
            RNUtils.lockPortrait();
        };
    });

    useNavigationHeader({
        showWhenPushed: true,
        headerOptions: {
            headerTitle: intl.formatMessage({id: 'mobile.calls_call_screen', defaultMessage: 'Call'}),
            ...getHeaderOptions(theme),
            contentStyle: {backgroundColor: '#000000'},
            headerStyle: {backgroundColor: '#000000'},
            headerShown: false,
        },
    });

    return (<CallScreen/>);
}
