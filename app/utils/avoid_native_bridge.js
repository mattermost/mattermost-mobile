
import {Platform} from 'react-native';

export default async function avoidNativeBridge(runOptimized, optimized, fallback) {
    if (Platform.OS === 'android' && runOptimized()) { // Only required for Android
        return optimized();
    }

    return await fallback();
}
