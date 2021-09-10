// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import React, {ReactNode, useCallback, useState} from 'react';
import {useIntl} from 'react-intl';
import {Text, View} from 'react-native';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import CompasIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {Preferences, Screens, View as ViewConstants} from '@constants';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {useTheme} from '@context/theme';
import {getTeammateNameDisplaySetting} from '@helpers/api/preference';
import {goToScreen} from '@screens/navigation';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {displayUsername} from '@utils/user';

import type {WithDatabaseArgs} from '@typings/database/database';
import type PreferenceModel from '@typings/database/models/servers/preference';
import type SystemModel from '@typings/database/models/servers/system';

type AutoCompleteSelectorArgs = {
    config: SystemModel;
    license: SystemModel;
    preferences: PreferenceModel[];
}

type AutoCompleteSelectorProps = {
    dataSource?: string;
    disabled?: boolean;
    errorText?: ReactNode;
    getDynamicOptions?: (userInput?: string) => Promise<DialogOption[]>;
    helpText?: ReactNode;
    label?: string;
    onSelected?: (selectedItem?: PostActionOption) => Promise<void>;
    optional?: boolean;
    options?: PostActionOption[];
    placeholder: string;
    roundedBorders?: boolean;
    selected?: PostActionOption;
    showRequiredAsterisk?: boolean;
    teammateNameDisplay: string;
}

const {SERVER: {PREFERENCE, SYSTEM}} = MM_TABLES;

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

const AutoCompleteSelector = ({
    dataSource, disabled, errorText, getDynamicOptions, helpText, label, onSelected, optional = false,
    options, placeholder, roundedBorders = true, selected, showRequiredAsterisk = false, teammateNameDisplay,
}: AutoCompleteSelectorProps) => {
    const intl = useIntl();
    const theme = useTheme();
    const [itemText, setItemText] = useState(selected?.text);
    const style = getStyleSheet(theme);
    const title = placeholder || intl.formatMessage({id: 'mobile.action_menu.select', defaultMessage: 'Select an option'});

    const goToSelectorScreen = useCallback(preventDoubleTap(() => {
        const screen = Screens.INTEGRATION_SELECTOR;
        goToScreen(screen, title, {dataSource, handleSelect, options, getDynamicOptions});
    }), [dataSource, options, getDynamicOptions]);

    const handleSelect = useCallback((item?: any) => {
        if (!item) {
            return;
        }

        let selectedText;
        let selectedValue;
        if (dataSource === ViewConstants.DATA_SOURCE_USERS) {
            selectedText = displayUsername(item, undefined, teammateNameDisplay);
            selectedValue = item.id;
        } else if (dataSource === ViewConstants.DATA_SOURCE_CHANNELS) {
            selectedText = item.display_name;
            selectedValue = item.id;
        } else {
            selectedText = item.text;
            selectedValue = item.value;
        }

        setItemText(selectedText);

        if (onSelected) {
            onSelected({text: selectedText, value: selectedValue});
        }
    }, []);

    let text = title;
    let selectedStyle = style.dropdownPlaceholder;

    if (itemText) {
        text = itemText;
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
                id='channel_modal.optional'
                defaultMessage='(optional)'
                style={style.optional}
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
        helpTextContent = <Text style={style.helpText}>{helpText}</Text>;
    }

    let errorTextContent;
    if (errorText) {
        errorTextContent = <Text style={style.errorText}>{errorText}</Text>;
    }

    return (
        <View style={style.container}>
            {labelContent}
            <TouchableWithFeedback
                disabled={disabled}
                onPress={goToSelectorScreen}
                style={disabled ? style.disabled : null}
                type='opacity'
            >
                <View style={inputStyle}>
                    <Text
                        numberOfLines={1}
                        style={selectedStyle}
                    >
                        {text}
                    </Text>
                    <CompasIcon
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
};

const withPreferences = withObservables([], ({database}: WithDatabaseArgs) => ({
    config: database.get(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CONFIG).pipe(switchMap((cfg: SystemModel) => cfg.value)),
    license: database.get(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.LICENSE),
    preferences: database.get(PREFERENCE).query(Q.where('category', Preferences.CATEGORY_DISPLAY_SETTINGS)).observe(),
}));

const withTeammateNameDisplay = withObservables(['preferences', 'config', 'license'], ({config, license, preferences}: AutoCompleteSelectorArgs) => ({
    teammateNameDisplay: of$(getTeammateNameDisplaySetting(preferences, config.value, license.value)),
}));

export default withDatabase(withPreferences(withTeammateNameDisplay(AutoCompleteSelector)));
