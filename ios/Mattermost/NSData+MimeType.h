//
//  NSData+MimeType.h
//  Mattermost
//
//  Created by Tek Min Ewe on 04/08/2019.
//  Copyright © 2019 Facebook. All rights reserved.
//

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface NSData (MimeType)

-(NSString *)mimeType;
-(NSString *)extension;

@end

NS_ASSUME_NONNULL_END
