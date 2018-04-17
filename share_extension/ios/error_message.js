import React from 'react';
import PropTypes from 'prop-types';
import {TouchableOpacity, View} from 'react-native';

import {Preferences} from 'mattermost-redux/constants';

import FormattedText from 'app/components/formatted_text';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

export default function errorMessage(props) {
    const {close} = props;
    const theme = Preferences.THEMES.default;
    const styles = getStyleSheet(theme);

    return (
        <View style={styles.errorWrapper}>
            <View style={styles.errorContainer}>
                <View style={styles.errorContent}>
                    <View style={styles.errorMessage}>
                        <FormattedText
                            style={styles.errorMessageText}
                            id={'mobile.share_extension.error_message'}
                            defaultMessage={'An error has occurred while using the share extension.'}
                        />
                    </View>
                    <TouchableOpacity
                        style={styles.errorButton}
                        onPress={() => close()}
                    >
                        <FormattedText
                            style={styles.errorButtonText}
                            id={'mobile.share_extension.error_close'}
                            defaultMessage={'Close'}
                        />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

errorMessage.propTypes = {
    close: PropTypes.func.isRequired,
    formatMessage: PropTypes.func.isRequired,
};

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        errorButton: {
            alignItems: 'center',
            justifyContent: 'center',
            borderTopWidth: 2,
            borderTopColor: changeOpacity(theme.linkColor, 0.3),
            paddingVertical: 15,
        },
        errorButtonText: {
            color: changeOpacity(theme.linkColor, 0.7),
            fontSize: 18,
        },
        errorContainer: {
            borderRadius: 5,
            backgroundColor: 'white',
            marginHorizontal: 35,
        },
        errorContent: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.05),
        },
        errorMessage: {
            alignItems: 'center',
            justifyContent: 'center',
            padding: 25,
        },
        errorMessageText: {
            color: theme.centerChannelColor,
            fontSize: 16,
            textAlign: 'center',
        },
        errorWrapper: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.5),
        },
    };
});
