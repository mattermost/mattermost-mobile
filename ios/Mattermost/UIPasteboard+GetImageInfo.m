//
//  UIPasteboard+GetImageInfo.m
//  Mattermost
//
//  Created by Tek Min Ewe on 05/08/2019.
//  Copyright © 2019 Facebook. All rights reserved.
//

#import "UIPasteboard+GetImageInfo.h"
#import "NSData+MimeType.h"
#import "Mattermost-Swift.h"
#import "UIImage+vImageScaling.h"

@implementation UIPasteboard (GetImageInfo)

-(NSArray<NSDictionary *> *)getCopiedFiles {
  NSMutableArray<NSDictionary *> *fileInfos = [[NSMutableArray alloc] init];
  NSArray<NSDictionary<NSString *,id> *> *items = self.items;
  for (int i = 0; i < items.count; i++) {
    NSDictionary *item = items[i];
    BOOL added = NO;
    for (int j = 0; j < item.allKeys.count; j++) {
      if (added) {
        continue;
      }

      NSString *type = item.allKeys[j];
    

      @try {
        NSString *uri = self.string;
        NSData *fileData = item[type];
        
        if ([type isEqual:@"public.jpeg"] || [type isEqual:@"public.heic"] || [type isEqual:@"public.png"]) {
          fileData = [self getDataForImageItem:item[type] type:type];
        } else if ([type isEqual:@"com.compuserve.gif"]) {
          fileData = [self dataForPasteboardType:type];
        }
        
        SwimeProxy *swimeProxy = [SwimeProxy shared];
        MimeTypeProxy *mimeProxy = [swimeProxy getMimeAndExtensionWithData:fileData uti:type];
        NSString *extension;
        NSString *mimeType;
        if (mimeProxy != nil) {
          extension = mimeProxy.ext;
          mimeType = mimeProxy.mime;
        } else {
          extension = [fileData extension];
          mimeType = [fileData mimeType];
        }
        
        if ([extension length] == 0) {
          continue;
        }
        
        NSString *tempFilename = [NSString stringWithFormat:@"%@.%@", [[NSProcessInfo processInfo] globallyUniqueString], extension];
        NSURL *tempFileURL = [NSURL fileURLWithPath:[NSTemporaryDirectory() stringByAppendingPathComponent:tempFilename]];
        BOOL success = [fileData writeToURL:tempFileURL atomically:YES];
        if (success) {
          added = YES;
          uri = tempFileURL.absoluteString;
          [fileInfos addObject:@{
            @"fileName": tempFilename,
            @"fileSize": @([fileData length]),
            @"type": mimeType,
            @"uri": uri,
          }];
        }
      } @catch (NSException *exception) {
        [fileInfos addObject:@{
          @"type": type,
          @"error": exception.reason,
        }];
      }
    }
  }
  
  return fileInfos;
}

-(NSData *) getDataForImageItem:(NSData *)imageData type:(NSString *)type {
  UIImage *image;
  if ([type isEqual:@"public.heic"]) {
    CFDataRef cfdata = CFDataCreate(NULL, [imageData bytes], [imageData length]);
    CGImageSourceRef source = CGImageSourceCreateWithData(cfdata, nil);
    CGImageRef imageRef = CGImageSourceCreateImageAtIndex(source, 0, nil);
    image = [[UIImage alloc] initWithCGImage:imageRef];
  } else {
    image = (UIImage *)imageData;
  }
  size_t width = CGImageGetWidth(image.CGImage);
  size_t height = CGImageGetHeight(image.CGImage);
  if (width > 6048 || height > 4032) {
    image = [image vImageScaledImageWithSize:CGSizeMake(2048, 2048) contentMode:UIViewContentModeScaleAspectFit];
  }
  
  if ([type isEqual:@"public.png"]) {
    return UIImagePNGRepresentation(image);
  }
  
  return UIImageJPEGRepresentation(image, 1.0);
}

@end
