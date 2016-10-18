// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component, PropTypes} from 'react';
import {ListView, StyleSheet, View, Text} from 'react-native';
const {DataSource} = ListView;
import {Actions as Routes} from 'react-native-router-flux';
import _ from 'lodash';
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

class ChannelsListView extends Component {
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
        const channels = _.values(this.props.channels.data);
        return (
            <View style={styles.container}>
                <ListView
                    dataSource={this.ds.cloneWithRows(channels)}
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

export default ChannelsListView;
