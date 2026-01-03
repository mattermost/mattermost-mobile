// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BottomSheetFooter, type BottomSheetFooterProps} from '@gorhom/bottom-sheet';
import React from 'react';
import {TouchableOpacity, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {useBottomSheetFooterStyles, useBottomSheetStyle} from '@screens/bottom_sheet/hooks';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

export type Props = BottomSheetFooterProps & {
    onCancel: () => void;
    onSubmit: () => void;
}

const TEXT_HEIGHT = 24; // typography 200 line height
const BUTTON_PADDING = 15;
const FOOTER_PADDING = 20;
export const FOOTER_HEIGHT = (FOOTER_PADDING * 2) + (BUTTON_PADDING * 2) + TEXT_HEIGHT;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flexDirection: 'row',
    },
    cancelButton: {
        alignItems: 'center',
        backgroundColor: changeOpacity(theme.buttonBg, 0.08),
        borderRadius: 4,
        flex: 1,
        paddingVertical: BUTTON_PADDING,
    },
    cancelButtonText: {
        color: theme.buttonBg,
        ...typography('Body', 200, 'SemiBold'),
    },
    applyButton: {
        alignItems: 'center',
        backgroundColor: theme.buttonBg,
        borderRadius: 4,
        flex: 1,
        marginLeft: 8,
        paddingVertical: BUTTON_PADDING,
    },
    applyButtonText: {
        color: theme.buttonColor,
        ...typography('Body', 200, 'SemiBold'),
    },
    separator: {
        height: 1,
        borderTopWidth: 3,
        borderTopColor: changeOpacity(theme.centerChannelColor, 0.08),
    },
}));

const PostPriorityPickerFooter = ({onCancel, onSubmit, ...props}: Props) => {
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const bottomStyle = useBottomSheetFooterStyles();
    const containerStyle = useBottomSheetStyle();
    const {bottom} = useSafeAreaInsets();

    const footer = (
        <View style={[style.container, containerStyle, {top: bottom}]}>
            <TouchableOpacity
                onPress={onCancel}
                style={style.cancelButton}
            >
                <FormattedText
                    id='post_priority.picker.cancel'
                    defaultMessage='Cancel'
                    style={style.cancelButtonText}
                />
            </TouchableOpacity>
            <TouchableOpacity
                onPress={onSubmit}
                style={style.applyButton}
            >
                <FormattedText
                    id='post_priority.picker.apply'
                    defaultMessage='Apply'
                    style={style.applyButtonText}
                />
            </TouchableOpacity>
        </View>
    );

    return (
        <BottomSheetFooter {...props}>
            <View style={[style.separator, bottomStyle, {height: undefined, top: undefined}]}/>
            {footer}
            <View style={bottomStyle}/>
        </BottomSheetFooter>
    );
};

export default PostPriorityPickerFooter;
