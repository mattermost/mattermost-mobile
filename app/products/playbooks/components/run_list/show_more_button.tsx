// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIntl} from 'react-intl';
import {StyleSheet, View} from 'react-native';

import Button from '@components/button';
import {useTheme} from '@context/theme';
import {usePreventDoubleTap} from '@hooks/utils';

type Props = {
    fetching: boolean;
    onPress: () => void;
    visible: boolean;
};

const styles = StyleSheet.create({
    container: {
        paddingTop: 16,
    },
});

const ShowMoreButton = ({
    fetching,
    onPress,
    visible,
}: Props) => {
    const intl = useIntl();
    const theme = useTheme();

    if (!visible) {
        return null;
    }

    const doubleTapPreventedOnPress = usePreventDoubleTap(onPress);

    return (
        <View style={styles.container}>
            <Button
                text={intl.formatMessage({id: 'playbooks.runs.show_more', defaultMessage: 'Show More'})}
                emphasis='tertiary'
                onPress={doubleTapPreventedOnPress}
                theme={theme}
                showLoader={fetching}
                testID='show-more-button'
            />
        </View>
    );
};

export default ShowMoreButton;
