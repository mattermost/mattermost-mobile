// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {
    Text,
    View,
} from 'react-native';

import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme, changeOpacity} from '@utils/theme';

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        row: {
            height: 40,
            paddingVertical: 8,
            flexDirection: 'row',
            alignItems: 'center',
        },
        rowPicture: {
            marginRight: 8,
            width: 20,
            alignItems: 'center',
            justifyContent: 'center',
        },
        rowIcon: {
            color: changeOpacity(theme.centerChannelColor, 0.7),
            fontSize: 18,
        },
        rowUsername: {
            fontSize: 15,
            color: theme.centerChannelColor,
        },
        rowFullname: {
            color: theme.centerChannelColor,
            flex: 1,
            opacity: 0.6,
        },
        textWrapper: {
            flex: 1,
            flexWrap: 'wrap',
            paddingRight: 8,
        },
    };
});

type Props = {
    completeHandle: string;
    defaultMessage: string;
    id: string;
    onPress: (handle: string) => void;
    testID?: string;
}
const SpecialMentionItem = ({
    completeHandle,
    defaultMessage,
    id,
    onPress,
    testID,
}: Props) => {
    const theme = useTheme();
    const style = getStyleFromTheme(theme);
    const completeMention = useCallback(() => {
        onPress(completeHandle);
    }, [completeHandle, onPress]);

    const specialMentionItemTestId = `${testID}.${id}`;

    return (
        <TouchableWithFeedback
            onPress={completeMention}
            underlayColor={changeOpacity(theme.buttonBg, 0.08)}
            testID={specialMentionItemTestId}
            type={'native'}
        >
            <View style={style.row}>
                <View style={style.rowPicture}>
                    <CompassIcon
                        name='account-multiple-outline'
                        style={style.rowIcon}
                    />
                </View>
                <Text
                    style={style.textWrapper}
                    numberOfLines={1}
                >
                    <Text
                        style={style.rowUsername}
                        testID={`${specialMentionItemTestId}.name`}
                    >
                        {`@${completeHandle} - `}
                    </Text>
                    <FormattedText
                        id={id}
                        defaultMessage={defaultMessage}
                        style={style.rowFullname}
                        testID={`${specialMentionItemTestId}.display_name`}
                    />
                </Text>
            </View>
        </TouchableWithFeedback>
    );
};

export default SpecialMentionItem;
