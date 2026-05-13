// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BottomSheetFooter, type BottomSheetFooterProps} from '@gorhom/bottom-sheet';
import React from 'react';
import {Pressable, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import usePressableOpacityStyle from '@hooks/use_pressable_opacity';
import {useBottomSheetStyle} from '@screens/bottom_sheet/hooks';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

export type Props = BottomSheetFooterProps & {
    onCancel: () => void;
    onSubmit: () => void;
}

const TEXT_HEIGHT = 24; // typography 200 line height
const BUTTON_PADDING = 15;
export const FOOTER_HEIGHT = (BUTTON_PADDING * 2) + TEXT_HEIGHT;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        backgroundColor: theme.centerChannelBg,
    },
    buttons: {
        flexDirection: 'row',
    },
    cancelButton: {
        alignItems: 'center',
        backgroundColor: changeOpacity(theme.buttonBg, 0.08),
        borderRadius: 4,
        flex: 1,
        paddingVertical: BUTTON_PADDING,
        marginLeft: 12,
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
        marginHorizontal: 12,
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
        marginVertical: 4,
    },
}));

const PostPriorityPickerFooter = ({onCancel, onSubmit, ...props}: Props) => {
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const {bottom} = useSafeAreaInsets();

    const cancelStyle = usePressableOpacityStyle(style.cancelButton);
    const applyStyle = usePressableOpacityStyle(style.applyButton);
    const containerStyle = useBottomSheetStyle();

    return (
        <BottomSheetFooter {...props}>
            <View style={style.separator}/>
            <View style={[style.container, containerStyle, {paddingBottom: bottom}]}>
                <View style={style.buttons}>
                    <Pressable
                        onPress={onCancel}
                        style={cancelStyle}
                    >
                        <FormattedText
                            id='post_priority.picker.cancel'
                            defaultMessage='Cancel'
                            style={style.cancelButtonText}
                        />
                    </Pressable>
                    <Pressable
                        onPress={onSubmit}
                        style={applyStyle}
                    >
                        <FormattedText
                            id='post_priority.picker.apply'
                            defaultMessage='Apply'
                            style={style.applyButtonText}
                        />
                    </Pressable>
                </View>
            </View>
        </BottomSheetFooter>
    );
};

export default PostPriorityPickerFooter;
