// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Platform, Text, TextStyle, TouchableOpacity, View, ViewStyle} from 'react-native';

import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import {t} from '@i18n';
import {makeStyleSheetFromTheme} from '@utils/theme';

type OptionText = {
    defaultMessage: string;
    id: string;
};

type Item = {
    action: () => void;
    icon: string;
    iconStyle: ViewStyle;
    text: OptionText | string;
    textStyle: TextStyle;
};

type Props = {
    items: Item[];
    onHandleCancelPress: () => void;
    onHandleItemPress: (fn: () => void) => void;
    title?: OptionText;
};

const OptionsItem = ({items, onHandleCancelPress, onHandleItemPress, title}: Props) => {
    const style = getStyleSheet(null);
    const isIOS = Platform.OS === 'ios';

    const getOptions = () => {
        return items.map(({action, icon, iconStyle, text, textStyle}, index) => {
            let textComponent;
            let optionIconStyle = style.optionIcon;

            if (typeof iconStyle !== 'undefined') {
                optionIconStyle = iconStyle;
            }

            if (text.hasOwnProperty('id')) {
                textComponent = (
                    <FormattedText
                        style={[
                            style.optionText,
                            textStyle,
                            isIOS && !icon && {textAlign: 'center'},
                        ]}
                        {...(text as OptionText)}
                    />
                );
            } else {
                textComponent = (
                    <Text
                        style={[
                            style.optionText,
                            textStyle,
                            isIOS && !icon && {textAlign: 'center'},
                        ]}
                    >
                        {text}
                    </Text>
                );
            }

            const key = `OptionsItem-Item-${index}`;
            const viewStyle = isIOS ? [index < items.length - 1 && style.optionBorder] : style.optionBorder;

            return (
                <View
                    key={key}
                    style={viewStyle}
                >
                    <TouchableOpacity
                        onPress={() => onHandleItemPress(action)}
                        style={style.option}
                    >
                        {textComponent}
                        {icon && (
                            <CompassIcon
                                name={icon}
                                size={18}
                                style={optionIconStyle}
                            />
                        )}
                    </TouchableOpacity>
                </View>
            );
        },
        );
    };

    const getIOSTitleView = () => {
        let textComponent;
        if (title) {
            if (title.hasOwnProperty('id')) {
                textComponent = (
                    <FormattedText
                        style={style.optionTitleText}
                        {...(title as OptionText)}
                    />
                );
            } else {
                textComponent = (
                    <Text style={style.optionTitleText}>{title}</Text>
                );
            }

            return (
                <View
                    key={items.length}
                    style={[style.option, style.optionBorder]}
                >
                    {textComponent}
                </View>
            );
        }

        return null;
    };

    return (
        <>
            {isIOS && getIOSTitleView()}
            {getOptions()}
            {!isIOS && (
                <TouchableOpacity
                    key={items.length}
                    onPress={onHandleCancelPress}
                    style={style.option}
                >
                    <FormattedText
                        id={t('channel_modal.cancel')}
                        defaultMessage='Cancel'
                        style={style.optionText}
                    />
                </TouchableOpacity>

            )}
        </>
    );
};

const getStyleSheet = makeStyleSheetFromTheme(() => {
    return {
        optionIcon: {
            color: '#7f8180',
        },
        optionText: {
            color: '#000',
            flex: 1,
            fontSize: 16,
        },
        optionBorder: {
            borderBottomWidth: 1,
            borderBottomColor: 'rgba(0, 0, 0, 0.1)',
        },
        option: {
            alignSelf: 'stretch',
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'space-between',
            padding: 15,
        },
    };
});

export default OptionsItem;
