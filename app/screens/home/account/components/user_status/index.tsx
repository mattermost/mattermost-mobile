// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {DeviceEventEmitter} from 'react-native';

import {setStatus} from '@actions/remote/user';
import DrawerItem from '@components/drawer_item';
import SlideUpPanelItem, {ITEM_HEIGHT} from '@components/slide_up_panel_item';
import StatusLabel from '@components/status_label';
import UserStatusIndicator from '@components/user_status';
import {Navigation} from '@constants';
import General from '@constants/general';
import {t} from '@i18n';
import {dismissModal, showModalOverCurrentContext} from '@screens/navigation';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity} from '@utils/theme';
import {confirmOutOfOfficeDisabled} from '@utils/user';

import type Database from '@nozbe/watermelondb/Database';
import type UserModel from '@typings/database/models/servers/user';

type Props = {
    currentUser: UserModel;
    database: Database;
    serverUrl: string;
    theme: Theme;
    styles: any;
};

const {OUT_OF_OFFICE, OFFLINE, AWAY, ONLINE, DND} = General;

const UserStatus = ({currentUser, database, serverUrl, styles, theme}: Props) => {
    const intl = useIntl();

    const handleSetStatus = useCallback(
        preventDoubleTap(() => {
            const renderContent = () => {
                return (
                    <>
                        <SlideUpPanelItem
                            icon='check-circle'
                            imageStyles={{color: theme.onlineIndicator}}
                            onPress={() => setUserStatus(ONLINE)}
                            testID='user_status.bottom_sheet.online'
                            text={intl.formatMessage({
                                id: t('mobile.set_status.online'),
                                defaultMessage: 'Online',
                            })}
                            textStyles={styles.menuLabel}
                        />
                        <SlideUpPanelItem
                            icon='clock'
                            imageStyles={{color: theme.awayIndicator}}
                            onPress={() => setUserStatus(AWAY)}
                            testID='user_status.bottom_sheet.away'
                            text={intl.formatMessage({
                                id: t('mobile.set_status.away'),
                                defaultMessage: 'Away',
                            })}
                            textStyles={styles.menuLabel}
                        />
                        <SlideUpPanelItem
                            icon='minus-circle'
                            imageStyles={{color: theme.dndIndicator}}
                            onPress={() => setUserStatus(DND)}
                            testID='user_status.bottom_sheet.dnd'
                            text={intl.formatMessage({
                                id: t('mobile.set_status.dnd'),
                                defaultMessage: 'Do Not Disturb',
                            })}
                            textStyles={styles.menuLabel}
                        />
                        <SlideUpPanelItem
                            icon='circle-outline'
                            imageStyles={{color: changeOpacity('#B8B8B8', 0.64)}}
                            onPress={() => setUserStatus(OFFLINE)}
                            testID='user_status.bottom_sheet.offline'
                            text={intl.formatMessage({
                                id: t('mobile.set_status.offline'),
                                defaultMessage: 'Offline',
                            })}
                            textStyles={styles.menuLabel}
                        />
                    </>
                );
            };

            showModalOverCurrentContext('BottomSheet', {
                renderContent,
                snapPoints: [5 * ITEM_HEIGHT, 10],
            });
        }),
        [],
    );

    const updateStatus = useCallback(async (status: string) => {
        await database.write(async () => {
            await currentUser.update((user: UserModel) => {
                user.status = status as unknown as string;
            });
        });

        await setStatus(serverUrl, {
            user_id: currentUser.id,
            status,
            manual: true,
            last_activity_at: Date.now(),
        });
    }, []);

    const setUserStatus = useCallback((status: string) => {
        if (currentUser.status === OUT_OF_OFFICE) {
            dismissModal();
            return confirmOutOfOfficeDisabled(intl, status, updateStatus);
        }

        updateStatus(status);
        DeviceEventEmitter.emit(Navigation.NAVIGATION_CLOSE_MODAL);
        return null;
    }, []);

    return (
        <DrawerItem
            testID='account.status.action'
            labelComponent={
                <StatusLabel
                    labelStyle={styles.menuLabel}
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
