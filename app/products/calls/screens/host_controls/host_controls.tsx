// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {StyleSheet} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {makeHost} from '@calls/actions/calls';
import SlideUpPanelItem from '@components/slide_up_panel_item';
import {Screens} from '@constants';
import BottomSheet from '@screens/bottom_sheet';
import {dismissBottomSheet} from '@screens/navigation';
import UserProfileTitle from '@screens/user_profile/title';
import {bottomSheetSnapPoint} from '@utils/helpers';

import type {CallSession, CurrentCall} from '@calls/types/calls';

const TITLE_HEIGHT = 118;
const ITEM_HEIGHT = 48;

type Props = {
    currentCall: CurrentCall;
    closeButtonId: string;
    session: CallSession;
    teammateNameDisplay: string;
    hideGuestTags: boolean;
}

const styles = StyleSheet.create({
    iconStyle: {
        marginRight: 6,
    },
});

export const HostControls = ({
    currentCall,
    closeButtonId,
    session,
    teammateNameDisplay,
    hideGuestTags,
}: Props) => {
    const intl = useIntl();
    const {bottom} = useSafeAreaInsets();

    const makeHostPress = useCallback(async () => {
        await makeHost(currentCall.serverUrl, currentCall.channelId, session.userId);
        await dismissBottomSheet();
    }, [currentCall, session.userId]);

    const snapPoints = useMemo(() => {
        return [
            1,
            bottomSheetSnapPoint(1, ITEM_HEIGHT, bottom) + TITLE_HEIGHT,
        ];
    }, [bottom]);

    const makeHostText = intl.formatMessage({id: 'mobile.calls_make_host', defaultMessage: 'Make host'});

    const renderContent = () => {
        if (!session?.userModel) {
            return null;
        }

        return (
            <>
                <UserProfileTitle
                    enablePostIconOverride={false}
                    enablePostUsernameOverride={false}
                    isChannelAdmin={false}
                    isSystemAdmin={false}
                    isTeamAdmin={false}
                    teammateDisplayName={teammateNameDisplay}
                    user={session.userModel}
                    hideGuestTags={hideGuestTags}
                />
                <SlideUpPanelItem
                    leftIcon={'monitor-account'}
                    leftIconStyles={styles.iconStyle}
                    onPress={makeHostPress}
                    text={makeHostText}
                />
            </>
        );
    };

    return (
        <BottomSheet
            renderContent={renderContent}
            closeButtonId={closeButtonId}
            componentId={Screens.CALL_HOST_CONTROLS}
            initialSnapIndex={1}
            snapPoints={snapPoints}
        />
    );
};
