// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BottomSheetFooter, type BottomSheetFooterProps} from '@gorhom/bottom-sheet';
import React from 'react';
import {Platform, TouchableOpacity, View} from 'react-native';

import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

export type Props = BottomSheetFooterProps & {
    onCancel: () => void;
    onSubmit: () => void;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        backgroundColor: theme.centerChannelBg,
        borderTopColor: changeOpacity(theme.centerChannelColor, 0.16),
        borderTopWidth: 1,
        paddingTop: 20,
        flexDirection: 'row',
        paddingHorizontal: 20,
    },
    cancelButton: {
        alignItems: 'center',
        backgroundColor: changeOpacity(theme.buttonBg, 0.08),
        borderRadius: 4,
        flex: 1,
        paddingVertical: 15,
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
        paddingVertical: 15,
    },
    applyButtonText: {
        color: theme.buttonColor,
        ...typography('Body', 200, 'SemiBold'),
    },
}));

const PostPriorityPickerFooter = ({onCancel, onSubmit, ...props}: Props) => {
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const isTablet = useIsTablet();

    return (
        <BottomSheetFooter {...props}>
            <View
                style={[style.container, {
                    paddingBottom: Platform.select({ios: (isTablet ? 20 : 32), android: 20}),
                }]}
            >
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
        </BottomSheetFooter>
    );
};

export default PostPriorityPickerFooter;
