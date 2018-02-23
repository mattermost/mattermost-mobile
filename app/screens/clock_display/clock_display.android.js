import React from 'react';
import PropTypes from 'prop-types';
import {
    TouchableOpacity,
    Modal,
    View,
} from 'react-native';

import StatusBar from 'app/components/status_bar';
import FormattedText from 'app/components/formatted_text';
import RadioButtonGroup from 'app/components/radio_button';

import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

import ClockDisplayBase from './clock_display_base';

export default class ClockDisplay extends ClockDisplayBase {
    static propTypes = {
        showModal: PropTypes.bool.isRequired,
        militaryTime: PropTypes.bool.isRequired,
        onClose: PropTypes.func.isRequired,
    };

    setMilitaryTime = (value) => {
        this.setState({
            newMilitaryTime: value,
        });
    };

    closeModal = () => {
        const {militaryTime, onClose} = this.props;
        this.setState({
            newMilitaryTime: militaryTime,
        });

        onClose();
    };

    saveSelection = () => {
        const {newMilitaryTime} = this.state;
        const {onClose} = this.props;
        this.saveClockDisplayPreference(newMilitaryTime);
        onClose();
    };

    renderClockDisplayModal = (style) => {
        const {showModal} = this.props;
        const {intl} = this.context;
        const {newMilitaryTime} = this.state;

        const options = [{
            label: intl.formatMessage({
                id: 'user.settings.display.normalClock',
                defaultMessage: '12-hour clock (example: 4:00 PM)',
            }),
            value: 'false',
            checked: newMilitaryTime === 'false',
        }, {
            label: intl.formatMessage({
                id: 'user.settings.display.militaryClock',
                defaultMessage: '24-hour clock (example: 16:00)',
            }),
            value: 'true',
            checked: newMilitaryTime === 'true',
        }];

        return (
            <Modal
                animationType='slide'
                transparent={true}
                visible={showModal}
                onRequestClose={this.closeModal}
            >
                <View style={style.modalOverlay}>
                    <View style={style.modal}>
                        <View style={style.modalBody}>
                            <View style={style.modalTitleContainer}>
                                <FormattedText
                                    id='mobile.advanced_settings.clockDisplay'
                                    defaultMessage='Clock display'
                                    style={style.modalTitle}
                                />
                            </View>
                            <RadioButtonGroup
                                name='replySettings'
                                onSelect={this.setMilitaryTime}
                                options={options}
                            />
                            <FormattedText
                                id='user.settings.display.preferTime'
                                defaultMessage='Select how you prefer time displayed.'
                                style={style.modalHelpText}
                            />
                        </View>
                        <View style={style.modalFooter}>
                            <View style={style.separator}/>
                            <View style={style.modalFooterContainer}>
                                <TouchableOpacity
                                    style={style.modalFooterOptionContainer}
                                    onPress={this.closeModal}
                                >
                                    <FormattedText
                                        id='mobile.notification_settings.modal_cancel'
                                        defaultMessage='CANCEL'
                                        style={style.modalFooterOption}
                                    />
                                </TouchableOpacity>
                                <View style={style.modalFooterButtonSpacer}/>
                                <TouchableOpacity
                                    style={style.modalFooterOptionContainer}
                                    onPress={this.saveSelection}
                                >
                                    <FormattedText
                                        id='mobile.notification_settings.modal_save'
                                        defaultMessage='SAVE'
                                        style={style.modalFooterOption}
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>
        );
    };

    render() {
        const {theme} = this.props;
        const style = getStyleSheet(theme);

        return (
            <View style={style.container}>
                <StatusBar/>
                <View style={style.wrapper}>
                    {this.renderClockDisplayModal(style)}
                </View>
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flex: 1,
            backgroundColor: theme.centerChannelBg,
        },
        wrapper: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.06),
            flex: 1,
        },
        separator: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
            height: 1,
            width: '100%',
        },
        modalOverlay: {
            backgroundColor: changeOpacity('#000000', 0.6),
            alignItems: 'center',
            flex: 1,
        },
        modal: {
            backgroundColor: theme.centerChannelBg,
            borderRadius: 4,
            marginTop: 20,
            width: '95%',
        },
        modalBody: {
            paddingHorizontal: 24,
        },
        modalTitleContainer: {
            marginBottom: 30,
            marginTop: 20,
        },
        modalTitle: {
            color: theme.centerChannelColor,
            fontSize: 19,
        },
        modalHelpText: {
            color: changeOpacity(theme.centerChannelColor, 0.5),
            fontSize: 13,
            marginTop: 20,
        },
        modalFooter: {
            alignItems: 'flex-end',
            height: 58,
            marginTop: 40,
            width: '100%',
        },
        modalFooterContainer: {
            alignItems: 'center',
            flex: 1,
            flexDirection: 'row',
            paddingRight: 24,
        },
        modalFooterOptionContainer: {
            alignItems: 'center',
            height: 40,
            justifyContent: 'center',
            paddingHorizontal: 10,
            paddingVertical: 5,
        },
        modalFooterOption: {
            color: theme.linkColor,
            fontSize: 14,
        },
        modalFooterButtonSpacer: {
            marginRight: 10,
        },
    };
});
