// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {View} from 'react-native';
import {Edge, SafeAreaView} from 'react-native-safe-area-context';

import OptionItem from '@app/components/option_item';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import {popTopScreen, setButtons} from '@screens/navigation';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {getTimezoneRegion, getUserTimezoneProps} from '@utils/user';

import type UserModel from '@typings/database/models/servers/user';

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flex: 1,
        },
        wrapper: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.06),
            flex: 1,
            paddingTop: 35,
        },
        divider: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
            height: 1,
        },
        separator: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
            height: 1,
            marginLeft: 15,
        },
        content: {
            paddingHorizontal: 8,
        },
    };
});

const edges: Edge[] = ['left', 'right'];
const SAVE_TIMEZONE_BUTTON_ID = 'save_timezone';

type DisplayTimezoneProps = {
    currentUser: UserModel;
    componentId: string;
}
const DisplayTimezone = ({currentUser, componentId}: DisplayTimezoneProps) => {
    const intl = useIntl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const timezone = useMemo(() => getUserTimezoneProps(currentUser), [currentUser.timezone]);

    const [automaticTimezone, setAutomaticTimezone] = useState(timezone.useAutomaticTimezone);
    const [timezoneRegion, setTimezoneRegion] = useState<string>(getTimezoneRegion(timezone.manualTimezone));

    const updateAutomaticTimezone = () => {
        //todo:
    };

    const goToSelectTimezone = () => {
        //todo:
    };

    const close = () => popTopScreen(componentId);

    const saveTimezone = useCallback(() => {
        //todo:
    }, [automaticTimezone, timezoneRegion, currentUser.timezone]);

    const saveButton = useMemo(() => {
        return {
            id: SAVE_TIMEZONE_BUTTON_ID,
            enabled: false,
            showAsAction: 'always' as const,
            testID: 'notification_settings.auto_res.save.button',
            color: theme.sidebarHeaderTextColor,
            text: intl.formatMessage({id: 'settings.save', defaultMessage: 'Save'}),
        };
    }, [theme.sidebarHeaderTextColor]);

    useEffect(() => {
        const enabled = false; //fixme

        const buttons = {
            rightButtons: [{
                ...saveButton,
                enabled,
            }],
        };
        setButtons(componentId, buttons);
    }, [componentId, currentUser.timezone]);

    useNavButtonPressed(SAVE_TIMEZONE_BUTTON_ID, componentId, saveTimezone, [saveTimezone]);

    useAndroidHardwareBackHandler(componentId, close);

    return (
        <SafeAreaView
            edges={edges}
            style={styles.container}
        >
            <View style={styles.wrapper}>
                <View style={styles.divider}/>
                <OptionItem
                    action={updateAutomaticTimezone}
                    containerStyle={styles.content}
                    description={timezoneRegion}
                    label={intl.formatMessage({id: 'mobile.timezone_settings.automatically', defaultMessage: 'Set automatically'})}
                    selected={automaticTimezone}
                    type='toggle'
                />
                {!automaticTimezone && (
                    <View>
                        <View style={styles.separator}/>
                        <OptionItem
                            action={goToSelectTimezone}
                            containerStyle={styles.content}
                            description={timezoneRegion}
                            label={intl.formatMessage({id: 'mobile.timezone_settings.manual', defaultMessage: 'Change timezone'})}
                            type='arrow'
                        />
                    </View>
                )}
                <View style={styles.divider}/>
            </View>
        </SafeAreaView>
    );
};

export default DisplayTimezone;
