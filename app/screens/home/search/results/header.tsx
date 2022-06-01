// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useCallback, useState} from 'react';
import {useIntl} from 'react-intl';
import {View} from 'react-native';

import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import SelectButton from './header_button';

export type SelectTab = 'files' | 'messages'

type Props = {
    onTabSelect: (tab: SelectTab) => void;
    numberFiles: number;
    numberMessages: number;
}

export const HEADER_HEIGHT = 64;

const getStyleFromTheme = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            backgroundColor: theme.centerChannelBg,
            marginHorizontal: 12,
            flexDirection: 'row',
            paddingVertical: 12,
            flexGrow: 0,
            height: HEADER_HEIGHT,
        },
        divider: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
            height: 1,
        },
    };
});

const Header = ({onTabSelect, numberFiles, numberMessages}: Props) => {
    const theme = useTheme();
    const styles = getStyleFromTheme(theme);
    const intl = useIntl();

    const messagesText = intl.formatMessage({id: 'screen.search.header.messages', defaultMessage: 'Messages'});
    const filesText = intl.formatMessage({id: 'screen.search.header.files', defaultMessage: 'Files'});

    const [tab, setTab] = useState(0);

    const handleMessagesPress = useCallback(() => {
        onTabSelect('messages');
        setTab(0);
    }, [onTabSelect]);

    const handleFilesPress = useCallback(() => {
        onTabSelect('files');
        setTab(1);
    }, [onTabSelect]);

    return (
        <>
            <View style={styles.container}>
                <SelectButton
                    selected={tab === 0}
                    onPress={handleMessagesPress}
                    text={`${messagesText} (${numberMessages})`}
                />
                <SelectButton
                    selected={tab === 1}
                    onPress={handleFilesPress}
                    text={`${filesText} (${numberFiles})`}
                />
            </View>
            <View style={styles.divider}/>
        </>

    );
};

export default Header;

