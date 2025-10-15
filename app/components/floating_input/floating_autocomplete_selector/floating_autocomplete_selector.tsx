// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {type IntlShape, useIntl} from 'react-intl';
import {Text, View, type StyleProp, type TextStyle, type ViewStyle} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {Screens, View as ViewConstants} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import DatabaseManager from '@database/manager';
import {usePreventDoubleTap} from '@hooks/utils';
import {getChannelById} from '@queries/servers/channel';
import {getUserById} from '@queries/servers/user';
import {goToScreen} from '@screens/navigation';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {secureGetFromRecord} from '@utils/types';
import {typography} from '@utils/typography';
import {displayUsername} from '@utils/user';

import FloatingInputContainer from '../floating_input_container';

type Selection = DialogOption | Channel | UserProfile | DialogOption[] | Channel[] | UserProfile[];

type AutoCompleteSelectorProps = {
    dataSource?: string;
    disabled?: boolean;
    errorText?: string;
    getDynamicOptions?: (userInput?: string) => Promise<DialogOption[]>;
    label: string;
    onSelected?: (value: SelectedDialogOption) => void;
    options?: DialogOption[];
    placeholder?: string;
    selected?: SelectedDialogValue;
    teammateNameDisplay: string;
    isMultiselect?: boolean;
    testID: string;
}

const INPUT_HEIGHT = 48;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        input: {
            backgroundColor: changeOpacity(theme.centerChannelBg, 0.9),
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            flex: 1,
        },
        dropdownPlaceholder: {
            color: changeOpacity(theme.centerChannelColor, 0.5),
        },
        dropdownText: {
            ...typography('Body', 200),
            color: theme.centerChannelColor,
        },
        disabled: {
            opacity: 0.5,
        },
    };
});

async function getItemName(serverUrl: string, selected: string, teammateNameDisplay: string, intl: IntlShape, dataSource?: string, options?: DialogOption[]): Promise<string> {
    if (!selected) {
        return '';
    }

    const database = secureGetFromRecord(DatabaseManager.serverDatabases, serverUrl)?.database;

    switch (dataSource) {
        case ViewConstants.DATA_SOURCE_USERS: {
            if (!database) {
                return intl.formatMessage({id: 'channel_loader.someone', defaultMessage: 'Someone'});
            }

            const user = await getUserById(database, selected);
            return displayUsername(user, intl.locale, teammateNameDisplay, true);
        }
        case ViewConstants.DATA_SOURCE_CHANNELS: {
            if (!database) {
                return intl.formatMessage({id: 'autocomplete_selector.unknown_channel', defaultMessage: 'Unknown channel'});
            }

            const channel = await getChannelById(database, selected);
            return channel?.displayName || intl.formatMessage({id: 'autocomplete_selector.unknown_channel', defaultMessage: 'Unknown channel'});
        }
    }

    const option = options?.find((opt) => opt.value === selected);
    return option?.text || '';
}

function getTextAndValueFromSelectedItem(item: Selection, teammateNameDisplay: string, locale: string, dataSource?: string) {
    if (dataSource === ViewConstants.DATA_SOURCE_USERS) {
        const user = item as UserProfile;
        return {text: displayUsername(user, locale, teammateNameDisplay), value: user.id};
    } else if (dataSource === ViewConstants.DATA_SOURCE_CHANNELS) {
        const channel = item as Channel;
        return {text: channel.display_name, value: channel.id};
    }
    return item as DialogOption;
}

function AutoCompleteSelector({
    dataSource,
    disabled = false,
    errorText,
    getDynamicOptions,
    label,
    onSelected,
    options,
    placeholder,
    selected,
    teammateNameDisplay,
    isMultiselect = false,
    testID,
}: AutoCompleteSelectorProps) {
    const intl = useIntl();
    const theme = useTheme();
    const [itemText, setItemText] = useState('');
    const style = getStyleSheet(theme);
    const title = placeholder || intl.formatMessage({id: 'mobile.action_menu.select', defaultMessage: 'Select an option'});
    const serverUrl = useServerUrl();
    const hasSelected = Boolean(itemText);

    const focusedLabel = Boolean(placeholder || hasSelected);

    const handleSelect = useCallback((newSelection?: Selection) => {
        if (!newSelection) {
            return;
        }

        if (!Array.isArray(newSelection)) {
            const selectedOption = getTextAndValueFromSelectedItem(newSelection, teammateNameDisplay, intl.locale, dataSource);
            setItemText(selectedOption.text);

            if (onSelected) {
                onSelected(selectedOption);
            }
            return;
        }

        const selectedOptions = newSelection.map((option) => getTextAndValueFromSelectedItem(option, teammateNameDisplay, intl.locale, dataSource));
        setItemText(selectedOptions.map((option) => option.text).join(', '));
        if (onSelected) {
            onSelected(selectedOptions);
        }
    }, [teammateNameDisplay, intl, dataSource, onSelected]);

    const goToSelectorScreen = usePreventDoubleTap(useCallback((() => {
        const screen = Screens.INTEGRATION_SELECTOR;
        goToScreen(screen, title, {dataSource, handleSelect, options, getDynamicOptions, selected, isMultiselect});
    }), [title, dataSource, handleSelect, options, getDynamicOptions, selected, isMultiselect]));

    // Handle the text for the default value.
    useEffect(() => {
        if (!selected) {
            return;
        }

        if (!Array.isArray(selected)) {
            getItemName(serverUrl, selected, teammateNameDisplay, intl, dataSource, options).then((res) => setItemText(res));
            return;
        }

        const namePromises = [];
        for (const item of selected) {
            namePromises.push(getItemName(serverUrl, item, teammateNameDisplay, intl, dataSource, options));
        }
        Promise.all(namePromises).then((names) => {
            setItemText(names.join(', '));
        });

        // We want to run this only in the first render, since it is only for the default value.
        // Future changes in the selected value will update the itemText accordingly.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const inputStyle = useMemo(() => {
        const res: StyleProp<ViewStyle> = [style.input];
        if (disabled) {
            res.push(style.disabled);
        }

        return res;
    }, [disabled, style.disabled, style.input]);

    const dropdownTextStyle = useMemo(() => {
        const res: StyleProp<TextStyle> = [style.dropdownText];
        if (!hasSelected) {
            res.push(style.dropdownPlaceholder);
        }

        return res;
    }, [hasSelected, style.dropdownPlaceholder, style.dropdownText]);

    return (
        <FloatingInputContainer
            hasValue={Boolean(itemText)}
            defaultHeight={INPUT_HEIGHT}
            label={label}
            error={errorText}
            hideErrorIcon={true}
            theme={theme}
            focus={goToSelectorScreen}
            focused={false}
            focusedLabel={focusedLabel}
            editable={!disabled}
            testID={testID}
        >
            <View style={inputStyle}>
                <Text
                    numberOfLines={1}
                    style={dropdownTextStyle}
                >
                    {itemText || placeholder}
                </Text>
                <CompassIcon
                    name='chevron-down'
                    color={changeOpacity(theme.centerChannelColor, 0.5)}
                />
            </View>
        </FloatingInputContainer>
    );
}

export default AutoCompleteSelector;
