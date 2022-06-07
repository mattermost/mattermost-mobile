// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';
import {useIntl} from 'react-intl';
import {StatusBar, View} from 'react-native';
import {Edge, SafeAreaView} from 'react-native-safe-area-context';

import {savePreference} from '@actions/remote/preference';
import Block from '@components/block';
import OptionItem from '@components/option_item';
import {Preferences} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {t} from '@i18n';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

const footer = {
    id: t('user.settings.display.preferTime'),
    defaultMessage: 'Select how you prefer time displayed.',
};

const edges: Edge[] = ['left', 'right'];

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flex: 1,
            backgroundColor: theme.centerChannelBg,
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
        containerStyle: {
            paddingHorizontal: 8,
        },
    };
});

type DisplayClockProps = {
    currentUserId: string;
    hasMilitaryTimeFormat: boolean;
}
const DisplayClock = ({currentUserId, hasMilitaryTimeFormat}: DisplayClockProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const [isMilitaryTimeFormat, setIsMilitaryTimeFormat] = useState(hasMilitaryTimeFormat);
    const serverUrl = useServerUrl();
    const intl = useIntl();

    //fixme: add a save button
    const saveClockDisplayPreference = useCallback(async (value: string) => {
        setIsMilitaryTimeFormat(value === 'true');
        const timePreference: PreferenceType = {
            category: Preferences.CATEGORY_DISPLAY_SETTINGS,
            name: 'use_military_time',
            user_id: currentUserId,
            value: `${value === 'true'}`,
        };

        await savePreference(serverUrl, [timePreference]);
    }, []);

    return (
        <SafeAreaView
            edges={edges}
            style={styles.container}
            testID='clock_display_settings.screen'
        >
            <StatusBar/>
            <View style={styles.wrapper}>
                <Block
                    disableHeader={true}
                    footerText={footer}
                >
                    <OptionItem
                        action={saveClockDisplayPreference}
                        containerStyle={styles.containerStyle}
                        label={intl.formatMessage({id: 'user.settings.display.normalClock', defaultMessage: '12-hour clock (example: 4:00 PM)'})}
                        selected={!isMilitaryTimeFormat}
                        testID='clock_display_settings.normal_clock.action'
                        type='select'
                        value={'false'}
                    />
                    <View style={styles.divider}/>
                    <OptionItem
                        action={saveClockDisplayPreference}
                        containerStyle={styles.containerStyle}
                        label={intl.formatMessage({id: 'user.settings.display.militaryClock', defaultMessage: '24-hour clock (example: 16:00)'})}
                        selected={isMilitaryTimeFormat}
                        testID='clock_display_settings.military_clock.action'
                        type='select'
                        value={'true'}
                    />
                </Block>
            </View>
        </SafeAreaView>
    );
};

export default DisplayClock;
