// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent, ReactNode} from 'react';
import {Text, View} from 'react-native';
import {intlShape} from 'react-intl';

import {displayUsername} from '@mm-redux/utils/user_utils';

import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {preventDoubleTap} from '@utils/tap';
import {makeStyleSheetFromTheme, changeOpacity} from '@utils/theme';
import {ViewTypes} from '@constants';
import {goToScreen} from '@actions/navigation';
import {AppSelectOption} from '@mm-redux/types/apps';
import {Theme} from '@mm-redux/types/preferences';
import {UserProfile} from '@mm-redux/types/users';
import {Channel} from '@mm-redux/types/channels';

type Props = {
    label?: string;
    placeholder?: string;
    dataSource?: string;
    options?: AppSelectOption[];
    selected?: AppSelectOption;
    optional?: boolean;
    showRequiredAsterisk?: boolean;
    teammateNameDisplay?: string;
    theme: Theme;
    onSelected?: (option: AppSelectOption) => void;
    helpText?: string;
    errorText?: ReactNode;
    roundedBorders?: boolean;
    disabled?: boolean;
    performLookupCall?: (term: string) => Promise<AppSelectOption[]>;
}

export default class AppFormSelector extends PureComponent<Props> {
    static contextTypes = {
        intl: intlShape,
    };

    static defaultProps = {
        optional: false,
        showRequiredAsterisk: false,
        roundedBorders: true,
    };

    handleSelect = (selected: UserProfile | Channel | AppSelectOption) => {
        if (!selected) {
            return;
        }

        const {
            dataSource,
            teammateNameDisplay,
        } = this.props;

        let selectedLabel;
        let selectedValue;
        if (dataSource === ViewTypes.DATA_SOURCE_USERS) {
            const user = selected as UserProfile;
            selectedLabel = user.username;
            if (teammateNameDisplay) {
                selectedLabel = displayUsername(user, teammateNameDisplay);
            }
            selectedValue = user.id;
        } else if (dataSource === ViewTypes.DATA_SOURCE_CHANNELS) {
            const channel = selected as Channel;
            selectedLabel = channel.display_name;
            selectedValue = channel.id;
        } else {
            const option = selected as AppSelectOption;
            selectedLabel = option.label;
            selectedValue = option.value;
        }

        const selectedOption = {label: selectedLabel, value: selectedValue};

        this.setState({selected: selectedOption});

        if (this.props.onSelected) {
            this.props.onSelected(selectedOption);
        }
    };

    goToSelectorScreen = preventDoubleTap(() => {
        const {formatMessage} = this.context.intl;
        const {dataSource, options, placeholder, performLookupCall} = this.props;
        const screen = 'AppSelectorScreen';
        const title = placeholder || formatMessage({id: 'mobile.action_menu.select', defaultMessage: 'Select an option'});

        const selectorProps = {
            data: options,
            dataSource,
            onSelect: this.handleSelect,
            performLookupCall,
        };

        goToScreen(screen, title, selectorProps);
    });

    render() {
        const {intl} = this.context;
        const {
            placeholder,
            theme,
            label,
            helpText,
            errorText,
            optional,
            showRequiredAsterisk,
            roundedBorders,
            disabled,
            selected,
        } = this.props;
        const style = getStyleSheet(theme);

        let text = placeholder || intl.formatMessage({id: 'mobile.action_menu.select', defaultMessage: 'Select an option'});
        let selectedStyle = style.dropdownPlaceholder;

        if (selected) {
            text = selected.label;
            selectedStyle = style.dropdownSelected;
        }

        let inputStyle = style.input;
        if (roundedBorders) {
            inputStyle = style.roundedInput;
        }

        let optionalContent;
        let asterisk;
        if (optional) {
            optionalContent = (
                <FormattedText
                    style={style.optional}
                    id='channel_modal.optional'
                    defaultMessage='(optional)'
                />
            );
        } else if (showRequiredAsterisk) {
            asterisk = <Text style={style.asterisk}>{' *'}</Text>;
        }

        let labelContent;
        if (label) {
            labelContent = (
                <View style={style.labelContainer}>
                    <Text style={style.label}>
                        {label}
                    </Text>
                    {asterisk}
                    {optionalContent}
                </View>
            );
        }

        let helpTextContent;
        if (helpText) {
            helpTextContent = (
                <Text style={style.helpText}>
                    {helpText}
                </Text>
            );
        }

        let errorTextContent;
        if (errorText) {
            errorTextContent = (
                <Text style={style.errorText}>
                    {errorText}
                </Text>
            );
        }

        return (
            <View style={style.container}>
                {labelContent}
                <TouchableWithFeedback
                    style={disabled ? style.disabled : null}
                    onPress={this.goToSelectorScreen}
                    type={'opacity'}
                    disabled={disabled}
                >
                    <View style={inputStyle}>
                        <Text
                            style={selectedStyle}
                            numberOfLines={1}
                        >
                            {text}
                        </Text>
                        <CompassIcon
                            name='chevron-down'
                            color={changeOpacity(theme.centerChannelColor, 0.5)}
                            style={style.icon}
                        />
                    </View>
                </TouchableWithFeedback>
                {helpTextContent}
                {errorTextContent}
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    const input = {
        borderWidth: 1,
        borderColor: changeOpacity(theme.centerChannelColor, 0.1),
        backgroundColor: changeOpacity(theme.centerChannelBg, 0.9),
        paddingLeft: 10,
        paddingRight: 30,
        paddingVertical: 7,
        height: 40,
    };

    return {
        container: {
            width: '100%',
            marginBottom: 2,
            marginRight: 8,
            marginTop: 10,
        },
        roundedInput: {
            ...input,
            borderRadius: 5,
        },
        input,
        dropdownPlaceholder: {
            top: 3,
            marginLeft: 5,
            color: changeOpacity(theme.centerChannelColor, 0.5),
        },
        dropdownSelected: {
            top: 3,
            marginLeft: 5,
            color: theme.centerChannelColor,
        },
        icon: {
            position: 'absolute',
            top: 13,
            right: 12,
        },
        labelContainer: {
            flexDirection: 'row',
            marginTop: 15,
            marginBottom: 10,
        },
        label: {
            fontSize: 14,
            color: theme.centerChannelColor,
            marginLeft: 15,
        },
        optional: {
            color: changeOpacity(theme.centerChannelColor, 0.5),
            fontSize: 14,
            marginLeft: 5,
        },
        helpText: {
            fontSize: 12,
            color: changeOpacity(theme.centerChannelColor, 0.5),
            marginHorizontal: 15,
            marginVertical: 10,
        },
        errorText: {
            fontSize: 12,
            color: theme.errorTextColor,
            marginHorizontal: 15,
            marginVertical: 10,
        },
        asterisk: {
            color: theme.errorTextColor,
            fontSize: 14,
        },
        disabled: {
            opacity: 0.5,
        },
    };
});
