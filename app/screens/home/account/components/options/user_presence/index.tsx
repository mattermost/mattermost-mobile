// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {TouchableOpacity, View} from 'react-native';

import {setStatus} from '@actions/remote/user';
import FormattedText from '@components/formatted_text';
import SlideUpPanelItem, {ITEM_HEIGHT} from '@components/slide_up_panel_item';
import StatusLabel from '@components/status_label';
import UserStatusIndicator from '@components/user_status';
import General from '@constants/general';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {TITLE_HEIGHT} from '@screens/bottom_sheet/content';
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
        listHeader: {
            marginBottom: 12,
        },
        listHeaderText: {
            color: theme.centerChannelColor,
            ...typography('Heading', 600, 'SemiBold'),
        },
    };
});

const {OUT_OF_OFFICE, OFFLINE, AWAY, ONLINE, DND} = General;

type Props = {
    currentUser: UserModel;
};
const UserStatus = ({currentUser}: Props) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const isTablet = useIsTablet();

    const handleSetStatus = useCallback(preventDoubleTap(() => {
        const renderContent = () => {
            return (
                <>
                    {!isTablet && (
                        <View style={styles.listHeader}>
                            <FormattedText
                                id='user_status.title'
                                defaultMessage={'Status'}
                                style={styles.listHeaderText}
                            />
                        </View>
                    )}
                    <SlideUpPanelItem
                        leftIcon='check-circle'
                        leftIconStyles={{color: theme.onlineIndicator}}
                        onPress={() => setUserStatus(ONLINE)}
                        testID='user_status.online.option'
                        text={intl.formatMessage({
                            id: 'user_status.online',
                            defaultMessage: 'Online',
                        })}
                        textStyles={styles.label}
                    />
                    <SlideUpPanelItem
                        leftIcon='clock'
                        leftIconStyles={{color: theme.awayIndicator}}
                        onPress={() => setUserStatus(AWAY)}
                        testID='user_status.away.option'
                        text={intl.formatMessage({
                            id: 'user_status.away',
                            defaultMessage: 'Away',
                        })}
                        textStyles={styles.label}
                    />
                    <SlideUpPanelItem
                        leftIcon='minus-circle'
                        leftIconStyles={{color: theme.dndIndicator}}
                        onPress={() => setUserStatus(DND)}
                        testID='user_status.dnd.option'
                        text={intl.formatMessage({
                            id: 'user_status.dnd',
                            defaultMessage: 'Do Not Disturb',
                        })}
                        textStyles={styles.label}
                    />
                    <SlideUpPanelItem
                        leftIcon='circle-outline'
                        leftIconStyles={{color: changeOpacity('#B8B8B8', 0.64)}}
                        onPress={() => setUserStatus(OFFLINE)}
                        testID='user_status.offline.option'
                        text={intl.formatMessage({
                            id: 'user_status.offline',
                            defaultMessage: 'Offline',
                        })}
                        textStyles={styles.label}
                    />
                </>
            );
        };

        const snapPoint = bottomSheetSnapPoint(4, ITEM_HEIGHT);
        bottomSheet({
            closeButtonId: 'close-set-user-status',
            renderContent,
            snapPoints: [1, (snapPoint + TITLE_HEIGHT)],
            title: intl.formatMessage({id: 'user_status.title', defaultMessage: 'Status'}),
            theme,
        });
    }), [theme]);

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
            testID='account.user_presence.option'
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
