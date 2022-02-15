// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {TextStyle} from 'react-native';

import {setStatus} from '@actions/remote/user';
import MenuItem from '@components/menu_item';
import SlideUpPanelItem, {ITEM_HEIGHT} from '@components/slide_up_panel_item';
import StatusLabel from '@components/status_label';
import UserStatusIndicator from '@components/user_status';
import General from '@constants/general';
import {useServerUrl} from '@context/server';
import {bottomSheet, dismissBottomSheet, dismissModal} from '@screens/navigation';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity} from '@utils/theme';
import {confirmOutOfOfficeDisabled} from '@utils/user';

import type UserModel from '@typings/database/models/servers/user';

type Props = {
    currentUser: UserModel;
    style: TextStyle;
    theme: Theme;
};

const {OUT_OF_OFFICE, OFFLINE, AWAY, ONLINE, DND} = General;

const UserStatus = ({currentUser, style, theme}: Props) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();

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
                        textStyles={style}
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
                        textStyles={style}
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
                        textStyles={style}
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
                        textStyles={style}
                    />
                </>
            );
        };

        bottomSheet({
            closeButtonId: 'close-set-user-status',
            renderContent,
            snapPoints: [(5 * ITEM_HEIGHT) + 10, 10],
            title: intl.formatMessage({id: 'account.user_status.title', defaultMessage: 'User Presence'}),
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
        <MenuItem
            testID='account.status.action'
            labelComponent={
                <StatusLabel
                    labelStyle={style}
                    status={currentUser.status}
                />
            }
            leftComponent={
                <UserStatusIndicator
                    size={24}
                    status={currentUser.status}
                />
            }
            separator={false}
            onPress={handleSetStatus}
            theme={theme}
        />
    );
};

export default UserStatus;
