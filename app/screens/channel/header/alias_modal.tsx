import React, {useState, useCallback} from 'react';
import {useIntl} from 'react-intl';
import {View, Text, TouchableOpacity, Alert, Keyboard} from 'react-native';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import FloatingTextInput from '@components/floating_text_input_label';
import {dismissModal} from '@screens/navigation';
import {useAliasSetter} from '@hooks/use_alias_setter';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flex: 1,
        backgroundColor: theme.centerChannelBg,
    },
    content: {
        padding: 20,
        flex: 1,
    },
    title: {
        ...typography('Heading', 600, 'SemiBold'),
        color: theme.centerChannelColor,
        marginBottom: 16,
        textAlign: 'center',
    },
    input: {
        marginBottom: 16,
    },
    buttons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 'auto',
    },
    button: {
        flex: 1,
        padding: 12,
        borderRadius: 4,
        marginHorizontal: 4,
        alignItems: 'center',
    },
    buttonCancel: {
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
    },
    buttonConfirm: {
        backgroundColor: theme.buttonBg,
    },
    buttonText: {
        ...typography('Body', 200, 'SemiBold'),
    },
    buttonTextCancel: {
        color: theme.centerChannelColor,
    },
    buttonTextConfirm: {
        color: theme.buttonColor,
    },
}));

type Props = {
    initialAlias?: string;
    serverUrl: string;
    channelId: string;
    currentUserId: string;
    searchTerm: string;
};

const dismissModalAndKeyboard = () => {
    Keyboard.dismiss();
    setTimeout(() => {
        dismissModal();
    }, 100);
};

const AliasModal = ({initialAlias, serverUrl, channelId, currentUserId, searchTerm}: Props) => {
    const {formatMessage} = useIntl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const [alias, setAlias] = useState(initialAlias || '');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const {setAlias: executeSetAlias} = useAliasSetter({
        serverUrl,
        channelId,
        currentUserId,
        searchTerm,
    });

    const handleSubmit = useCallback(async () => {
        if (!alias.trim()) {
            Alert.alert(
                formatMessage({id: 'channel_header.set_alias.error.title', defaultMessage: 'Error'}),
                formatMessage({id: 'channel_header.set_alias.error.empty', defaultMessage: 'Alias cannot be empty'}),
            );
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await executeSetAlias(alias);
            if (result.error) {
                Alert.alert(
                    formatMessage({id: 'channel_header.set_alias.error.title', defaultMessage: 'Error'}),
                    typeof result.error === 'string' ? result.error : formatMessage({id: 'channel_header.set_alias.error.unknown', defaultMessage: 'Failed to set alias'}),
                );
            } else {
                dismissModalAndKeyboard();
            }
        } catch (error) {
            Alert.alert(
                formatMessage({id: 'channel_header.set_alias.error.title', defaultMessage: 'Error'}),
                formatMessage({id: 'channel_header.set_alias.error.unknown', defaultMessage: 'Failed to set alias'}),
            );
        } finally {
            setIsSubmitting(false);
        }
    }, [alias, executeSetAlias, formatMessage]);

    const handleCancel = useCallback(() => {
        dismissModalAndKeyboard();
    }, []);

    return (
        <View style={styles.content}>
                <Text style={styles.title}>
                    {formatMessage({id: 'channel_header.set_alias.title', defaultMessage: 'Set Alias'})}
                </Text>
                <FloatingTextInput
                    label={formatMessage({id: 'channel_header.set_alias.placeholder', defaultMessage: 'Enter alias for this user'})}
                    value={alias}
                    onChangeText={setAlias}
                    theme={theme}
                    style={styles.input}
                    autoFocus={true}
                    returnKeyType='done'
                    onSubmitEditing={handleSubmit}
                    editable={!isSubmitting}
                />
                <View style={styles.buttons}>
                    <TouchableOpacity
                        style={[styles.button, styles.buttonCancel]}
                        onPress={handleCancel}
                        disabled={isSubmitting}
                    >
                        <Text style={[styles.buttonText, styles.buttonTextCancel]}>
                            {formatMessage({id: 'mobile.alert.cancel', defaultMessage: 'Cancel'})}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.button, styles.buttonConfirm]}
                        onPress={handleSubmit}
                        disabled={isSubmitting}
                    >
                        <Text style={[styles.buttonText, styles.buttonTextConfirm]}>
                            {isSubmitting 
                                ? formatMessage({id: 'mobile.alert.submitting', defaultMessage: 'Setting...'})
                                : formatMessage({id: 'mobile.alert.ok', defaultMessage: 'OK'})
                            }
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
    );
};

export default AliasModal; 