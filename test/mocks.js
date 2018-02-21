import {addMock} from 'mocha-react-native';

addMock('react-native-device-info', {
    getBuildNumber: () => true,
    getVersion: () => true,
    getDeviceLocale: () => 'en',
});
addMock('react-native-linear-gradient', {});
addMock('UIManager', {});
