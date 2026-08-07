// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {defineMessages, type IntlShape, useIntl} from 'react-intl';
import {Text, View} from 'react-native';

import SelectedChannelChip from '@components/chips/selected_channel_chip';
import SelectedChip from '@components/chips/selected_chip';
import SelectedUserChipById from '@components/chips/selected_user_chip_by_id';
import CompassIcon from '@components/compass_icon';
import FloatingInputContainer from '@components/floating_input/floating_input_container';
import Footer from '@components/settings/footer';
import {Screens, View as ViewConstants} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import DatabaseManager from '@database/manager';
import {usePreventDoubleTap} from '@hooks/utils';
import NetworkManager from '@managers/network_manager';
import {getActiveServerUrl} from '@queries/app/servers';
import {getChannelById} from '@queries/servers/channel';
import {getUserById, observeTeammateNameDisplay} from '@queries/servers/user';
import {navigateToScreen} from '@screens/navigation';
import SettingsStore from '@store/settings_store';
import {logDebug} from '@utils/log';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {secureGetFromRecord} from '@utils/types';
import {typography} from '@utils/typography';
import {displayUsername} from '@utils/user';

import type {WithDatabaseArgs} from '@typings/database/database';
import type {AvailableScreens} from '@typings/screens/navigation';

export type Selection = DialogOption | Channel | UserProfile | DialogOption[] | Channel[] | UserProfile[];

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
    selected?: SelectedDialogValue;
    teammateNameDisplay: string;
    isMultiselect?: boolean;
    testID: string;
    location: AvailableScreens;

    // Interim solution not to rewrite this component nor
    // break any existing features that rely on it, until
    // we apply blocks in all integration surfaces.
    omitMargins?: boolean;
}

const CHIP_GAP = 8;
const INPUT_HEIGHT = 48;

const messages = defineMessages({
    optional: {
        id: 'channel_modal.optional',
        defaultMessage: '(optional)',
    },
});

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            width: '100%',
            marginBottom: 2,
            marginRight: 8,
            marginTop: 10,
        },
        noMargins: {
            marginBottom: 0,
            marginRight: 0,
            marginTop: 0,
        },
        input: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
        },
        disabled: {
            opacity: 0.5,
        },
        dropdownPlaceholder: {
            ...typography('Body', 200),
            color: changeOpacity(theme.centerChannelColor, 0.5),
            flex: 1,
        },
        chips: {
            flex: 1,
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: CHIP_GAP,
            alignItems: 'center',
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

            if (channel?.displayName) {
                return channel.displayName;
            }

            // If channel not found locally, try to fetch from server
            try {
                const activeServerUrl = await getActiveServerUrl();
                if (activeServerUrl) {
                    const client = NetworkManager.getClient(activeServerUrl);
                    const serverChannel = await client.getChannel(selected);
                    return serverChannel?.display_name || intl.formatMessage({id: 'autocomplete_selector.unknown_channel', defaultMessage: 'Unknown channel'});
                }
            } catch (error) {
                logDebug('[AutoCompleteSelector.getItemName] Failed to fetch channel from server', error);
            }

            return intl.formatMessage({id: 'autocomplete_selector.unknown_channel', defaultMessage: 'Unknown channel'});
        }
    }

    const option = options?.find((opt) => opt.value === selected);
    return option?.text || '';
}

function rememberSelectionLabels(selection: DialogOption | DialogOption[], labelByValue: Record<string, string>) {
    if (Array.isArray(selection)) {
        for (const option of selection) {
            labelByValue[option.value] = option.text;
        }
        return;
    }
    labelByValue[selection.value] = selection.text;
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

function normalizeSelectedValues(selected?: SelectedDialogValue): string[] {
    if (!selected) {
        return [];
    }
    return Array.isArray(selected) ? selected : [selected];
}

function mergeOptionLabels(
    prev: Record<string, string>,
    selectedValues: string[],
    names: string[],
    cachedLabels: Record<string, string>,
): Record<string, string> {
    const next = {...prev};
    for (let index = 0; index < selectedValues.length; index++) {
        const value = selectedValues[index];
        const known = cachedLabels[value] || prev[value];
        if (known) {
            next[value] = known;
            continue;
        }
        if (names[index]) {
            next[value] = names[index];
        }
    }
    return next;
}

function labelsFromOptions(options: DialogOption[]): Record<string, string> {
    const next: Record<string, string> = {};
    for (const option of options) {
        next[option.value] = option.text;
    }
    return next;
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
    selected,
    teammateNameDisplay,
    isMultiselect = false,
    testID,
    location,
    omitMargins = false,
}: AutoCompleteSelectorProps) {
    const intl = useIntl();
    const theme = useTheme();
    const [optionLabels, setOptionLabels] = useState<Record<string, string>>({});
    const style = getStyleSheet(theme);
    const selectorTitle = placeholder || intl.formatMessage({id: 'mobile.action_menu.select', defaultMessage: 'Select an option'});
    const serverUrl = useServerUrl();
    const selectedValues = useMemo(() => normalizeSelectedValues(selected), [selected]);
    const hasValue = selectedValues.length > 0;
    const isUserSource = dataSource === ViewConstants.DATA_SOURCE_USERS;
    const isChannelSource = dataSource === ViewConstants.DATA_SOURCE_CHANNELS;

    const trimmedLabel = label?.trim() || '';
    const floatingLabel = useMemo(() => {
        if (!trimmedLabel) {
            return '';
        }
        if (optional) {
            return `${trimmedLabel} ${intl.formatMessage(messages.optional)}`;
        }
        return `${trimmedLabel} *`;
    }, [intl, optional, trimmedLabel]);

    // Float when filled or when a placeholder keeps the small label parked on the border.
    // With only a field label and no placeholder, the empty state uses the large in-box label.
    const focusedLabel = hasValue || Boolean(placeholder?.trim());

    // Dynamic selects do not pass `options`, so after a selection the form updates `selected` and
    // the effect below cannot resolve a label from options alone. Cache labels from the picker.
    const selectionLabelsRef = useRef<Record<string, string>>({});

    const handleSelect = useCallback((newSelection?: Selection) => {
        if (!newSelection) {
            return;
        }

        if (!Array.isArray(newSelection)) {
            const selectedOption = getTextAndValueFromSelectedItem(newSelection, teammateNameDisplay, intl.locale, dataSource);
            rememberSelectionLabels(selectedOption, selectionLabelsRef.current);
            if (!isUserSource) {
                setOptionLabels((prev) => ({...prev, [selectedOption.value]: selectedOption.text}));
            }

            if (onSelected) {
                onSelected(selectedOption);
            }
            return;
        }

        const selectedOptions = newSelection.map((option) => getTextAndValueFromSelectedItem(option, teammateNameDisplay, intl.locale, dataSource));
        rememberSelectionLabels(selectedOptions, selectionLabelsRef.current);
        if (!isUserSource) {
            setOptionLabels((prev) => ({...prev, ...labelsFromOptions(selectedOptions)}));
        }
        if (onSelected) {
            onSelected(selectedOptions);
        }
    }, [teammateNameDisplay, intl, dataSource, isUserSource, onSelected]);

    const handleRemove = useCallback((id: string) => {
        const remainingIds = selectedValues.filter((value) => value !== id);
        if (!remainingIds.length) {
            onSelected?.(undefined);
            return;
        }

        const remainingOptions = remainingIds.map((value) => ({
            value,
            text: selectionLabelsRef.current[value] || optionLabels[value] || value,
        }));
        onSelected?.(isMultiselect ? remainingOptions : remainingOptions[0]);
    }, [isMultiselect, onSelected, optionLabels, selectedValues]);

    const goToSelectorScreen = usePreventDoubleTap(useCallback((() => {
        SettingsStore.setIntegrationsSelectCallback(handleSelect);
        SettingsStore.setIntegrationsDynamicOptionsCallback(getDynamicOptions);
        navigateToScreen(Screens.INTEGRATION_SELECTOR, {
            dataSource,
            options,
            selected,
            title: selectorTitle,
            isMultiselect,
        });
    }), [handleSelect, getDynamicOptions, dataSource, options, selected, selectorTitle, isMultiselect]));

    // Keep pill labels in sync with the controlled `selected` value (defaults / external updates).
    useEffect(() => {
        let cancelled = false;

        if (!selectedValues.length || isUserSource) {
            return () => {
                cancelled = true;
            };
        }

        const cachedOptions = Object.entries(selectionLabelsRef.current).map(([value, text]) => ({value, text}));
        const optionsWithCache = options?.length ? [...options, ...cachedOptions] : cachedOptions;
        const namePromises = selectedValues.map((item) => (
            getItemName(serverUrl, item, teammateNameDisplay, intl, dataSource, optionsWithCache)
        ));

        Promise.all(namePromises).then((names) => {
            if (cancelled) {
                return;
            }
            setOptionLabels((prev) => mergeOptionLabels(prev, selectedValues, names, selectionLabelsRef.current));
        });

        return () => {
            cancelled = true;
        };
    }, [dataSource, teammateNameDisplay, intl, isUserSource, options, selectedValues, serverUrl]);

    let selectionContent;
    if (hasValue) {
        selectionContent = (
            <View style={style.chips}>
                {selectedValues.map((value) => {
                    if (isUserSource) {
                        return (
                            <SelectedUserChipById
                                key={value}
                                userId={value}
                                onPress={handleRemove}
                                teammateNameDisplay={teammateNameDisplay}
                                testID={`${testID}.user_chip.${value}`}
                            />
                        );
                    }

                    const chipText = selectionLabelsRef.current[value] || optionLabels[value] || value;
                    if (isChannelSource) {
                        return (
                            <SelectedChannelChip
                                key={value}
                                id={value}
                                text={chipText}
                                onRemove={handleRemove}
                                testID={`${testID}.channel_chip.${value}`}
                            />
                        );
                    }

                    return (
                        <SelectedChip
                            key={value}
                            id={value}
                            text={chipText}
                            onRemove={handleRemove}
                            testID={`${testID}.option_chip.${value}`}
                        />
                    );
                })}
            </View>
        );
    } else if (placeholder?.trim()) {
        selectionContent = (
            <Text
                numberOfLines={1}
                style={style.dropdownPlaceholder}
            >
                {placeholder}
            </Text>
        );
    } else {
        selectionContent = <View style={style.chips}/>;
    }

    return (
        <View style={[style.container, omitMargins && style.noMargins]}>
            <FloatingInputContainer
                canGrow={true}
                defaultHeight={INPUT_HEIGHT}
                editable={!disabled}
                error={errorText}
                focus={disabled ? undefined : goToSelectorScreen}
                focused={false}
                focusedLabel={focusedLabel}
                hasValue={hasValue}
                hideErrorIcon={true}
                label={floatingLabel}
                labelTestID={`${testID}.label`}
                pressableTestID={`${testID}.select.button`}
                testID={`${testID}.select`}
                theme={theme}
                wrapChildren={true}
            >
                <View style={[style.input, disabled && style.disabled]}>
                    {selectionContent}
                    <CompassIcon
                        name='chevron-right'
                        size={20}
                        color={changeOpacity(theme.centerChannelColor, 0.5)}
                    />
                </View>
            </FloatingInputContainer>
            {Boolean(helpText) && (
                <Footer
                    disabled={disabled}
                    helpText={helpText}
                    location={location}
                />
            )}
        </View>
    );
}

const withTeammateNameDisplay = withObservables([], ({database}: WithDatabaseArgs) => {
    return {
        teammateNameDisplay: observeTeammateNameDisplay(database),
    };
});

export default withDatabase(withTeammateNameDisplay(AutoCompleteSelector));
