import {addMock} from 'mocha-react-native';

addMock('react-native-device-info', {
    getBuildNumber: () => true,
    getVersion: () => true
});
addMock('react-native-linear-gradient', {});
addMock('UIManager', {});
