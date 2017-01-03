// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';

import {StyleSheet, View} from 'react-native';
import FormattedText from 'app/components/formatted_text';

const Styles = StyleSheet.create({
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#b3b3b3'
    },
    dividerContainer: {
        height: 20,
        marginLeft: 15,
        marginRight: 15
    },
    dividerText: {
        flex: 1,
        textAlign: 'center'
    }
});

export default class LineDivider extends React.Component {
    static propTypes = {
        color: React.PropTypes.string.isRequired,
        translationId: React.PropTypes.string,
        translationText: React.PropTypes.string,
        side: React.PropTypes.oneOf(['left', 'right', 'center'])
    };

    static defaultProps = {
        side: 'right'
    };

    renderLine() {
        return (
            <View style={[Styles.dividerLine, {backgroundColor: this.props.color}]}/>
        );
    }

    render() {
        let renderText;
        if (this.props.translationId && this.props.translationText) {
            renderText = (
                <View style={Styles.dividerContainer}>
                    <FormattedText
                        style={[Styles.dividerText, {color: this.props.color}]}
                        id={this.props.translationId}
                        defaultMessage={this.props.translationText}
                    />
                </View>
            );
        }

        let content = (
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                {this.renderLine()}
                {renderText}
            </View>
        );
        if (this.props.side === 'left') {
            content = (
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    {renderText}
                    {this.renderLine()}
                </View>
            );
        } else if (this.props.side === 'center') {
            content = (
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    {this.renderLine()}
                    {renderText}
                    {this.renderLine()}
                </View>
            );
        }

        return content;
    }
}
