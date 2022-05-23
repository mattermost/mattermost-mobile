// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useCallback, useState} from 'react';
import {useIntl} from 'react-intl';
import {View} from 'react-native';

import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

export const MessageTab = 'messages';
export const FileTab = 'files';
export type SelectTab = typeof MessageTab | typeof FileTab;

import SelectButton from './header_button';

type Props = {
    onHeaderSelect: (val: string) => void;
    numberFiles: number;
    numberMessages: number;
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        flex: {
            flex: 1,
        },
        container: {
            marginHorizontal: 12,
            flexDirection: 'row',
            marginBottom: 12,
        },
        divider: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
            height: 1,
        },
    };
});

const Header = ({onHeaderSelect, numberFiles, numberMessages}: Props) => {
    const theme = useTheme();
    const styles = getStyleFromTheme(theme);
    const intl = useIntl();

    const messagesText = intl.formatMessage({id: 'screen.search.header.messages', defaultMessage: 'Messages'});
    const filesText = intl.formatMessage({id: 'screen.search.header.files', defaultMessage: 'Files'});

    const [tab, setTab] = useState(0);

    const handleMessagesPress = useCallback(() => {
        onHeaderSelect(MessageTab);
        setTab(0);
    }, [onHeaderSelect]);

    const handleFilesPress = useCallback(() => {
        onHeaderSelect(FileTab);
        setTab(1);
    }, [onHeaderSelect]);

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

