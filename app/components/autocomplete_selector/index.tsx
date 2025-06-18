// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import React, {useCallback, useEffect, useState} from 'react';
import {type IntlShape, useIntl} from 'react-intl';
import {Text, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import Footer from '@components/settings/footer';
import Label from '@components/settings/label';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {Screens, View as ViewConstants} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import DatabaseManager from '@database/manager';
import {getChannelById} from '@queries/servers/channel';
import {getUserById, observeTeammateNameDisplay} from '@queries/servers/user';
import {goToScreen} from '@screens/navigation';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {secureGetFromRecord} from '@utils/types';
import {displayUsername} from '@utils/user';

import type {WithDatabaseArgs} from '@typings/database/database';
import type {AvailableScreens} from '@typings/screens/navigation';

type Selection = DialogOption | Channel | UserProfile | DialogOption[] | Channel[] | UserProfile[];

type AutoCompleteSelectorProps = {
    dataSource?: string;
    disabled?: boolean;
    errorText?: string;
    getDynamicOptions?: (userInput?: string) => Promise<DialogOption[]>;
    helpText?: string;
    label?: string;
    onSelected?: (value: SelectedDialogOption) => void;
    optional?: boolean;
    options?: DialogOption[];
    placeholder?: string;
    roundedBorders?: boolean;
    selected?: SelectedDialogValue;
    showRequiredAsterisk?: boolean;
    teammateNameDisplay: string;
    isMultiselect?: boolean;
    testID: string;
    location: AvailableScreens;
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
    helpText,
    label,
    onSelected,
    optional = false,
    options,
    placeholder,
    roundedBorders = true,
    selected,
    teammateNameDisplay,
    isMultiselect = false,
    testID,
    location,
}: AutoCompleteSelectorProps) {
    const intl = useIntl();
    const theme = useTheme();
    const [itemText, setItemText] = useState('');
    const style = getStyleSheet(theme);
    const title = placeholder || intl.formatMessage({id: 'mobile.action_menu.select', defaultMessage: 'Select an option'});
    const serverUrl = useServerUrl();

    const goToSelectorScreen = useCallback(preventDoubleTap(() => {
        const screen = Screens.INTEGRATION_SELECTOR;
        goToScreen(screen, title, {dataSource, handleSelect, options, getDynamicOptions, selected, isMultiselect});
    }), [dataSource, options, getDynamicOptions]);

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
    }, [dataSource, teammateNameDisplay, intl, options, selected, serverUrl]);

    return (
        <View style={style.container}>
            {Boolean(label) && (
                <Label
                    label={label!}
                    optional={optional}
                    testID={testID}
                />
            )}
            <TouchableWithFeedback
                disabled={disabled}
                onPress={goToSelectorScreen}
                style={disabled ? style.disabled : null}
                type='opacity'
            >
                <View style={roundedBorders ? style.roundedInput : style.input}>
                    <Text
                        numberOfLines={1}
                        style={itemText ? style.dropdownSelected : style.dropdownPlaceholder}
                    >
                        {itemText || title}
                    </Text>
                    <CompassIcon
                        name='chevron-down'
                        color={changeOpacity(theme.centerChannelColor, 0.5)}
                        style={style.icon}
                    />
                </View>
            </TouchableWithFeedback>
            <Footer
                disabled={disabled}
                helpText={helpText}
                errorText={errorText}
                location={location}
            />
        </View>
    );
}

const withTeammateNameDisplay = withObservables([], ({database}: WithDatabaseArgs) => {
    return {
        teammateNameDisplay: observeTeammateNameDisplay(database),
    };
});

export default withDatabase(withTeammateNameDisplay(AutoCompleteSelector));
