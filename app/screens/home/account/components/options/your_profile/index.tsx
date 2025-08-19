// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {DeviceEventEmitter} from 'react-native';

import OptionItem from '@components/option_item';
import {Events, Screens} from '@constants';
import {ACCOUNT_OUTLINE_IMAGE} from '@constants/profile';
import {usePreventDoubleTap} from '@hooks/utils';
import {showModal} from '@screens/navigation';

type Props = {
    isTablet: boolean;
}

const YourProfile = ({isTablet}: Props) => {
    const intl = useIntl();
    const openProfile = usePreventDoubleTap(useCallback(() => {
        if (isTablet) {
            DeviceEventEmitter.emit(Events.ACCOUNT_SELECT_TABLET_VIEW, Screens.EDIT_PROFILE);
        } else {
            showModal(
                Screens.EDIT_PROFILE,
                intl.formatMessage({id: 'mobile.screen.your_profile', defaultMessage: 'Your Profile'}),
            );
        }
    }, [intl, isTablet]));

    return (
        <OptionItem
            icon={ACCOUNT_OUTLINE_IMAGE}
            label={intl.formatMessage({id: 'account.your_profile', defaultMessage: 'Your Profile'})}
            testID='account.your_profile.option'
            type='default'
            action={openProfile}
        />
    );
};

export default YourProfile;
