// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import {View, Text} from 'react-native';

class EmojiKeyboard extends React.Component {
  render() {
    return (
      <View style={{flex:1, backgroundColor:'blue'}}>
        <Text style={{color: 'red'}}>Emoji Keyboard</Text>
      </View>
    );
  }
}

export default EmojiKeyboard;
