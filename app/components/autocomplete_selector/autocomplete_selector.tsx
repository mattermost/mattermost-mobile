// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ActionResult} from '@mm-redux/types/actions';
import {Channel} from '@mm-redux/types/channels';
import {DialogOption} from '@mm-redux/types/integrations';
import {Theme} from '@mm-redux/types/theme';
import {UserProfile} from '@mm-redux/types/users';
import {displayUsername} from '@mm-redux/utils/user_utils';
import React, {PureComponent} from 'react';
import {intlShape} from 'react-intl';
import {Text, View, Platform} from 'react-native';

import {goToScreen} from '@actions/navigation';
import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import Markdown from '@components/markdown';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {ViewTypes} from '@constants';
import {getMarkdownBlockStyles, getMarkdownTextStyles} from '@utils/markdown';
import {preventDoubleTap} from '@utils/tap';
import {makeStyleSheetFromTheme, changeOpacity} from '@utils/theme';

type Selection = DialogOption | Channel | UserProfile | DialogOption[] | Channel[] | UserProfile[];

type Props = {
    actions: {
        setAutocompleteSelector: (dataSource: any, onSelect: any, options: any, getDynamicOptions: any) => Promise<ActionResult>;
    };
    getDynamicOptions?: (term: string) => Promise<ActionResult>;
    label?: string;
    placeholder?: string;
    dataSource?: string;
    options?: DialogOption[];
    selected?: DialogOption | DialogOption[] | null;
    optional?: boolean;
    showRequiredAsterisk?: boolean;
    teammateNameDisplay?: string;
    theme: Theme;
    onSelected?: ((item: DialogOption) => void) | ((item: DialogOption[]) => void);
    onClear?: () => void;
    helpText?: string;
    errorText?: string;
    roundedBorders?: boolean;
    disabled?: boolean;
    isMultiselect?: boolean;
}

type State = {
    selectedText: string;
    selected?: DialogOption | DialogOption[] | null;
}

export default class AutocompleteSelector extends PureComponent<Props, State> {
    static contextTypes = {
        intl: intlShape,
    };

    static defaultProps = {
        optional: false,
        showRequiredAsterisk: false,
        roundedBorders: true,
    };

    constructor(props: Props) {
        super(props);

        this.state = {
            selectedText: '',
        };
    }

    static getDerivedStateFromProps(props: Props, state: State) {
        if (props.selected === state.selected) {
            return null;
        }

        if (!props.selected) {
            if (state.selected) {
                return {selected: props.selected};
            }

            return null;
        }

        if (!props.isMultiselect) {
            return {
                selectedText: (props.selected as DialogOption).text,
                selected: props.selected,
            };
        }

        const options = props.selected as DialogOption[];
        let selectedText = '';
        const selected: DialogOption[] = [];

        options.forEach((option) => {
            if (selectedText !== '') {
                selectedText += ', ';
            }
            selectedText += option.text;
            selected.push(option);
        });

        return {
            selectedText,
            selected,
        };
    }

    handleClear = () => {
        this.setState({selectedText: ''});
        this.props.onClear?.();
    };

    handleSelect = (selected: Selection) => {
        if (!selected) {
            return;
        }

        const {
            dataSource,
            teammateNameDisplay,
        } = this.props;

        if (!this.props.isMultiselect) {
            let selectedText: string;
            let selectedValue: string;
            switch (dataSource) {
                case ViewTypes.DATA_SOURCE_USERS: {
                    const typedSelected = selected as UserProfile;
                    selectedText = displayUsername(typedSelected, teammateNameDisplay || '');
                    selectedValue = typedSelected.id;
                    break;
                }
                case ViewTypes.DATA_SOURCE_CHANNELS: {
                    const typedSelected = selected as Channel;
                    selectedText = typedSelected.display_name;
                    selectedValue = typedSelected.id;
                    break;
                }
                default: {
                    const typedSelected = selected as DialogOption;
                    selectedText = typedSelected.text;
                    selectedValue = typedSelected.value;
                }
            }

            this.setState({selectedText});

            if (this.props.onSelected) {
                (this.props.onSelected as (opt: DialogOption) => void)({text: selectedText, value: selectedValue});
            }
            return;
        }

        let selectedText = '';
        const selectedOptions: DialogOption[] = [];
        switch (dataSource) {
            case ViewTypes.DATA_SOURCE_USERS: {
                const typedSelected = selected as UserProfile[];
                typedSelected.forEach((option) => {
                    if (selectedText !== '') {
                        selectedText += ', ';
                    }
                    const text = displayUsername(option, teammateNameDisplay || '');
                    selectedText += text;
                    selectedOptions.push({text, value: option.id});
                });
                break;
            }
            case ViewTypes.DATA_SOURCE_CHANNELS: {
                const typedSelected = selected as Channel[];
                typedSelected.forEach((option) => {
                    if (selectedText !== '') {
                        selectedText += ', ';
                    }
                    const text = option.display_name;
                    selectedText += text;
                    selectedOptions.push({text, value: option.id});
                });
                break;
            }
            default: {
                const typedSelected = selected as DialogOption[];
                typedSelected.forEach((option) => {
                    if (selectedText !== '') {
                        selectedText += ', ';
                    }
                    selectedText += option.text;
                    selectedOptions.push(option);
                });
                break;
            }
        }

        this.setState({selectedText});

        if (this.props.onSelected) {
            (this.props.onSelected as (opt: DialogOption[]) => void)(selectedOptions);
        }
    };

    goToSelectorScreen = preventDoubleTap(async () => {
        const closeButton = await CompassIcon.getImageSource(Platform.select({ios: 'arrow-back-ios', default: 'arrow-left'}), 24, this.props.theme.sidebarHeaderTextColor);

        // @ts-expect-error context type definition
        const {formatMessage} = this.context.intl;
        const {actions, dataSource, options, placeholder, getDynamicOptions, theme} = this.props;
        const screen = 'SelectorScreen';
        const title = placeholder || formatMessage({id: 'mobile.action_menu.select', defaultMessage: 'Select an option'});
        const buttonName = formatMessage({id: 'mobile.forms.select.done', defaultMessage: 'Done'});

        actions.setAutocompleteSelector(dataSource, this.handleSelect, options, getDynamicOptions);
        let screenOptions = {};
        if (this.props.isMultiselect) {
            screenOptions = {
                topBar: {
                    leftButtons: [{
                        id: 'close-dialog',
                        icon: closeButton,
                    }],
                    rightButtons: [{
                        id: 'submit-form',
                        showAsAction: 'always',
                        text: buttonName,
                    }],
                    leftButtonColor: theme.sidebarHeaderTextColor,
                    rightButtonColor: theme.sidebarHeaderTextColor,
                },
            };
        }
        goToScreen(screen, title, {isMultiselect: this.props.isMultiselect, selected: this.state.selected}, screenOptions);
    });

    render() {
        // @ts-expect-error context type definition
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
            onClear,
        } = this.props;
        const {selectedText} = this.state;
        const style = getStyleSheet(theme);
        const textStyles = getMarkdownTextStyles(theme);
        const blockStyles = getMarkdownBlockStyles(theme);

        let text = placeholder || intl.formatMessage({id: 'mobile.action_menu.select', defaultMessage: 'Select an option'});
        let selectedStyle = style.dropdownPlaceholder;

        if (selectedText) {
            text = selectedText;
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
                <View style={style.helpTextContainer} >
                    <Markdown
                        baseTextStyle={style.helpText}
                        textStyles={textStyles}
                        blockStyles={blockStyles}
                        value={helpText}
                    />
                </View>
            );
        }

        let errorTextContent;
        if (errorText) {
            errorTextContent = (
                <View style={style.errorTextContainer} >
                    <Markdown
                        baseTextStyle={style.errorText}
                        textStyles={textStyles}
                        blockStyles={blockStyles}
                        value={errorText}
                        disableAtChannelMentionHighlight={true}
                        disableHashtags={true}
                    />
                </View>
            );
        }

        const noediting = disabled ? style.disabled : null;

        return (
            <View style={style.container}>
                {labelContent}
                <TouchableWithFeedback
                    onPress={this.goToSelectorScreen}
                    type={'opacity'}
                    disabled={disabled}
                >
                    <View style={[inputStyle, noediting]}>
                        <Text
                            style={selectedStyle}
                            numberOfLines={1}
                        >
                            {text}
                        </Text>
                        {!disabled && onClear && selected && (
                            <TouchableWithFeedback
                                type={'opacity'}
                                onPress={this.handleClear}
                                disabled={disabled}
                                style={style.clearx}
                                hitSlop={clearXHitSlop}
                            >
                                <CompassIcon
                                    name='close-circle'
                                    color={changeOpacity(theme.centerChannelColor, 0.5)}
                                    size={20}
                                />
                            </TouchableWithFeedback>
                        )}
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
            paddingRight: 55,
            color: changeOpacity(theme.centerChannelColor, 0.5),
        },
        dropdownSelected: {
            top: 3,
            marginLeft: 5,
            paddingRight: 55,
            color: theme.centerChannelColor,
        },
        clearx: {
            position: 'absolute',
            top: 1,
            right: 5,
            padding: 8,
            marginRight: 7,
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
        helpTextContainer: {
            marginHorizontal: 15,
            marginTop: 10,
        },
        helpText: {
            fontSize: 12,
            color: changeOpacity(theme.centerChannelColor, 0.5),
        },
        errorTextContainer: {
            marginHorizontal: 15,
            marginVertical: 10,
        },
        errorText: {
            fontSize: 12,
            color: theme.errorTextColor,
        },
        asterisk: {
            color: theme.errorTextColor,
            fontSize: 14,
        },
        disabled: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
        },
    };
});

const clearXHitSlop = {
    left: 30,
    right: 20,
    top: 20,
    bottom: 20,
};
