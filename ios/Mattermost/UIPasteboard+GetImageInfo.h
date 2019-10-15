//
//  UIPasteboard+GetImageInfo.h
//  Mattermost
//
//  Created by Tek Min Ewe on 05/08/2019.
//  Copyright © 2019 Facebook. All rights reserved.
//

#import <UIKit/UIKit.h>

NS_ASSUME_NONNULL_BEGIN

@interface UIPasteboard (GetImageInfo)

-(NSArray<NSDictionary *> *)getCopiedFiles;

@end

NS_ASSUME_NONNULL_END
