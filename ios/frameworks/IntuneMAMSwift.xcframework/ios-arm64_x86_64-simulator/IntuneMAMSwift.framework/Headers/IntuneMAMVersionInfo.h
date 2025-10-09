//
//  Copyright (c) Microsoft Corporation. All rights reserved.
//

#import <Foundation/Foundation.h>


__attribute__((visibility("default")))
@interface IntuneMAMVersionInfo : NSObject

// SDK version is composed of non-negative integers separated by periods
// Version components decrease in significance from left to right
// Example: 6.0.5
+ (NSString*_Nonnull) sdkVersion;

@end
