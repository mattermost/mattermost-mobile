// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {TouchableOpacity, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {setStatus} from '@actions/remote/user';
import SlideUpPanelItem, {ITEM_HEIGHT} from '@components/slide_up_panel_item';
import StatusLabel from '@components/status_label';
import UserStatusIndicator from '@components/user_status';
import General from '@constants/general';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {bottomSheet, dismissBottomSheet, dismissModal} from '@screens/navigation';
import {bottomSheetSnapPoint} from '@utils/helpers';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {confirmOutOfOfficeDisabled} from '@utils/user';

import type UserModel from '@typings/database/models/servers/user';

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        label: {
            color: theme.centerChannelColor,
            ...typography('Body', 200),
            textAlignVertical: 'center',
            includeFontPadding: false,
        },
        body: {
            flexDirection: 'row',
            marginTop: 18,
        },
        spacer: {
            marginLeft: 16,
        },
    };
});

const {OUT_OF_OFFICE, OFFLINE, AWAY, ONLINE, DND} = General;

type Props = {
    currentUser: UserModel;
};
const UserStatus = ({currentUser}: Props) => {
    const intl = useIntl();
    const insets = useSafeAreaInsets();
    const serverUrl = useServerUrl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const handleSetStatus = useCallback(preventDoubleTap(() => {
        const renderContent = () => {
            return (
                <>
                    <SlideUpPanelItem
                        icon='check-circle'
                        imageStyles={{color: theme.onlineIndicator}}
                        onPress={() => setUserStatus(ONLINE)}
                        testID='user_status.bottom_sheet.online'
                        text={intl.formatMessage({
                            id: 'mobile.set_status.online',
                            defaultMessage: 'Online',
                        })}
                        textStyles={styles.label}
                    />
                    <SlideUpPanelItem
                        icon='clock'
                        imageStyles={{color: theme.awayIndicator}}
                        onPress={() => setUserStatus(AWAY)}
                        testID='user_status.bottom_sheet.away'
                        text={intl.formatMessage({
                            id: 'mobile.set_status.away',
                            defaultMessage: 'Away',
                        })}
                        textStyles={styles.label}
                    />
                    <SlideUpPanelItem
                        icon='minus-circle'
                        imageStyles={{color: theme.dndIndicator}}
                        onPress={() => setUserStatus(DND)}
                        testID='user_status.bottom_sheet.dnd'
                        text={intl.formatMessage({
                            id: 'mobile.set_status.dnd',
                            defaultMessage: 'Do Not Disturb',
                        })}
                        textStyles={styles.label}
                    />
                    <SlideUpPanelItem
                        icon='circle-outline'
                        imageStyles={{color: changeOpacity('#B8B8B8', 0.64)}}
                        onPress={() => setUserStatus(OFFLINE)}
                        testID='user_status.bottom_sheet.offline'
                        text={intl.formatMessage({
                            id: 'mobile.set_status.offline',
                            defaultMessage: 'Offline',
                        })}
                        textStyles={styles.label}
                    />
                </>
            );
        };

        const snapPoint = bottomSheetSnapPoint(4, ITEM_HEIGHT, insets.bottom);
        bottomSheet({
            closeButtonId: 'close-set-user-status',
            renderContent,
            snapPoints: [snapPoint, 10],
            title: intl.formatMessage({id: 'account.user_status.title', defaultMessage: 'User Presence'}),
            theme,
        });
    }), [theme, insets]);

    const updateStatus = useCallback((status: string) => {
        const userStatus = {
            user_id: currentUser.id,
            status,
            manual: true,
            last_activity_at: Date.now(),
        };

        setStatus(serverUrl, userStatus);
    }, []);

    const setUserStatus = useCallback((status: string) => {
        if (currentUser.status === OUT_OF_OFFICE) {
            dismissModal();
            return confirmOutOfOfficeDisabled(intl, status, updateStatus);
        }

        updateStatus(status);
        dismissBottomSheet();
        return null;
    }, []);

    return (
        <TouchableOpacity
            onPress={handleSetStatus}
        >
            <View style={styles.body}>
                <UserStatusIndicator
                    size={24}
                    status={currentUser.status}
                />
                <StatusLabel
                    labelStyle={[styles.label, styles.spacer]}
                    status={currentUser.status}
                />
            </View>
        </TouchableOpacity>
    );
};

export default UserStatus;
