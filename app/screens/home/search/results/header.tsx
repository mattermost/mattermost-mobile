// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useCallback, useState} from 'react';
import {useIntl} from 'react-intl';
import {Text, View} from 'react-native';
import Button from 'react-native-button';

import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

type Props = {
    onHeaderSelect: (val: string) => void;
    numberFiles: number;
    numberMessages: number;
}

type ButtonProps = {
    onPress: () => void;
    selected: boolean;
    text: string;
}

const Header = ({onHeaderSelect, numberFiles, numberMessages}: Props) => {
    const theme = useTheme();
    const styles = getStyleFromTheme(theme);
    const intl = useIntl();

    const messagesText = intl.formatMessage({id: 'screen.search.header.messages', defaultMessage: 'Messages'});
    const filesText = intl.formatMessage({id: 'screen.search.header.files', defaultMessage: 'Files'});

    const [tab, setTab] = useState(0);

    const handleMessagesPress = useCallback(() => {
        onHeaderSelect('message-tab');
        setTab(0);
    }, [onHeaderSelect]);

    const handleFilesPress = useCallback(() => {
        onHeaderSelect('file-tab');
        setTab(1);
    }, [onHeaderSelect]);

    const SelectButton = ({selected, onPress, text}: ButtonProps) => {
        return (
            <Button
                containerStyle={[styles.button, selected && styles.selectedButton]}
                onPress={onPress}
            >
                <Text style={[styles.text, selected && styles.selectedText]}>
                    {text}
                </Text >
            </Button>
        );
    };

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

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        flex: {
            flex: 1,
        },
        container: {
            marginHorizontal: 20,
            flexDirection: 'row',
            marginTop: 20,
            marginBottom: 12,
        },
        button: {
            alignItems: 'center',
            borderRadius: 4,
            height: 40,
        },
        text: {
            marginHorizontal: 16,
            marginVertical: 8,
            fontSize: 16,
        },
        selectedButton: {
            backgroundColor: changeOpacity(theme.buttonBg, 0.1),
        },
        selectedText: {
            color: theme.buttonBg,
        },
        divider: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
            height: 1,
        },
    };
});

export default Header;

