// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component, PropTypes} from 'react';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {ListView, StyleSheet, View, Text} from 'react-native';
const {DataSource} = ListView;
import {Actions as Routes} from 'react-native-router-flux'; // eslint-disable-line no-unused-vars

import * as channelActions from 'actions/channels';

// import _ from 'lodash';
import ErrorText from 'components/error_text';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 200,
        backgroundColor: 'white'
    }
});

const propTypes = {
    channels: PropTypes.object.isRequired,
    actions: PropTypes.object.isRequired
};

class ChannelsList extends Component {
    static propTypes = propTypes;
    ds: DataSource = new DataSource({rowHasChanged: (r1, r2) => r1 !== r2});

    componentWillMount() {
        this.props.actions.fetchChannels();
    }

    componentWillReceiveProps(props) {
        if (props.channels.currentChannelId &&
          !this.props.channels.currentChannelId) {
            Routes.goToPostsList();
        }
    }

    setChannel(channel) {
        this.props.actions.selectChannel(channel);
    }

    render() {
        return (
            <View style={styles.container}>
                <ListView
                    dataSource={this.ds.cloneWithRows(this.props.channels.data)}
                    enableEmptySections={true}
                    renderRow={(channel) => (
                        <Text onPress={() => this.props.actions.selectChannel(channel)}>
                            {channel.display_name}
                        </Text>
                    )}
                />

                <ErrorText error={this.props.channels.error}/>
            </View>
        );
    }
}

function mapStateToProps(state) {
    return {
        channels: state.entities.channels
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators(channelActions, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(ChannelsList);
