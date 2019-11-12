//
//  NSData+MimeType.m
//  Mattermost
//
//  Created by Tek Min Ewe on 04/08/2019.
//  Copyright © 2019 Facebook. All rights reserved.
//

#import "NSData+MimeType.h"

@implementation NSData (MimeType)

-(NSString *)mimeType {
  uint8_t c;
  [self getBytes:&c length:1];
  
  switch (c) {
    case 0xFF:
      return @"image/jpeg";
      break;
    case 0x89:
      return @"image/png";
      break;
    case 0x47:
      return @"image/gif";
      break;
    case 0x49:
    case 0x4D:
      return @"image/tiff";
      break;
    default:
      return @"";
  }
}

-(NSString *)extension {
  uint8_t c;
  [self getBytes:&c length:1];
  
  switch (c) {
    case 0xFF:
      return @"jpg";
      break;
    case 0x89:
      return @"png";
      break;
    case 0x47:
      return @"gif";
      break;
    case 0x49:
    case 0x4D:
      return @"tiff";
      break;
    default:
      return @"";
  }
}

@end
