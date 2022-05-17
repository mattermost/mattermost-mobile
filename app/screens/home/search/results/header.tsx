// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {Text, View} from 'react-native';
import Button from 'react-native-button';

import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

type Props = {
    onToggle: (val: boolean) => void;
    showMessages: boolean;
    numberFiles: number;
    numberMessages: number;
}
const Header = ({onToggle, showMessages, numberFiles, numberMessages}: Props) => {
    const theme = useTheme();
    const styles = getStyleFromTheme(theme);
    const intl = useIntl();

    const messagesText = intl.formatMessage({id: 'screen.search.header.messages', defaultMessage: 'Messages'});
    const filesText = intl.formatMessage({id: 'screen.search.header.files', defaultMessage: 'Files'});

    const handleMessagesPress = useCallback(() => {
        onToggle(true);
    }, [onToggle, showMessages]);

    const handleFilesPress = useCallback(() => {
        onToggle(false);
    }, [onToggle, showMessages]);

    type ButtonProps = {
        onPress: () => void;
        selected: boolean;
        text: string;
    }
    const SelectButton = ({selected, onPress, text}: ButtonProps) => {
        return (
            <Button
                containerStyle={[styles.button, selected ? styles.selectedButton : undefined]}
                onPress={onPress}
            >
                <Text style={[styles.text, showMessages ? styles.selectedText : undefined]}>
                    {text}
                </Text >
            </Button>
        );
    };

    return (
        <>
            <View style={styles.container}>
                <SelectButton
                    selected={showMessages}
                    onPress={handleMessagesPress}
                    text={`${messagesText} (${numberMessages})`}
                />
                <SelectButton
                    selected={!showMessages}
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

