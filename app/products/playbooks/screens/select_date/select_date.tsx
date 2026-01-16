// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useNavigation} from 'expo-router';
import moment, {type Moment} from 'moment';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {Keyboard, Text, View} from 'react-native';

import Button from '@components/button';
import DateTimeSelector from '@components/data_time_selector';
import NavigationButton from '@components/navigation_button';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useBackNavigation from '@hooks/navigate_back';
import {getDueDateString} from '@playbooks/utils/time';
import {navigateBack} from '@screens/navigation';
import CallbackStore from '@store/callback_store';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {getTimezone} from '@utils/user';

type Props = {
    selectedDate?: number;
    currentUserTimezone: UserTimezone | null | undefined;
}

function removeCallback() {
    CallbackStore.removeCallback();
}

function close () {
    Keyboard.dismiss();
    removeCallback();
    navigateBack();
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => ({
    container: {
        flex: 1,
        padding: 16,
        gap: 8,
    },
    dateText: {
        ...typography('Body', 300, 'Regular'),
        color: theme.centerChannelColor,
    },
}));

export default function SelectDate({
    selectedDate,
    currentUserTimezone,
}: Props) {
    const [date, setDate] = useState<Moment | undefined>(() => (selectedDate ? moment(selectedDate) : undefined));
    const navigation = useNavigation();
    const theme = useTheme();
    const intl = useIntl();
    const styles = getStyleSheet(theme);

    const initialDate = useMemo(() => moment(selectedDate), [selectedDate]);
    const canSave = useMemo(() => {
        if (!date && !selectedDate) {
            return false;
        }

        if ((date && !selectedDate) || (!date && selectedDate)) {
            return true;
        }

        if (!date) {
            return true;
        }

        return !date.isSame(selectedDate);
    }, [date, selectedDate]);

    const handleSave = useCallback(() => {
        if (!canSave) {
            return;
        }
        const onSave = CallbackStore.getCallback<((date: number | undefined) => void)>();
        onSave?.(date?.valueOf());
        close();
    }, [canSave, date]);

    const handleClear = useCallback(() => {
        setDate(undefined);
    }, []);

    useEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <NavigationButton
                    onPress={handleSave}
                    testID='playbooks.select_date.save.button'
                    text={intl.formatMessage({id: 'playbooks.edit_due_date.save.button', defaultMessage: 'Save'})}
                    disabled={!canSave}
                />
            ),
        });
    }, [canSave, handleSave, intl, navigation]);

    useBackNavigation(removeCallback);
    useAndroidHardwareBackHandler(Screens.PLAYBOOKS_SELECT_DATE, close);

    const timezone = getTimezone(currentUserTimezone);

    const dateText = getDueDateString(intl, date?.valueOf(), timezone, true);

    return (
        <View style={styles.container}>
            <Text style={styles.dateText}>{dateText}</Text>
            <Button
                text={intl.formatMessage({id: 'playbooks.edit_due_date.clear.button', defaultMessage: 'Clear'})}
                onPress={handleClear}
                emphasis='link'
                theme={theme}
                size='lg'
            />
            <DateTimeSelector
                handleChange={setDate}
                theme={theme}
                initialDate={initialDate}
                timezone={timezone}
                minuteInterval={5}
            />
        </View>
    );
}
