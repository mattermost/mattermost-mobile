//
//  UIImage+vImageScaling.m
//  UIImage+vImageScaling
//
//  Created by Matt Donnelly on 03/07/2013.
//  Copyright (c) 2013 Matt Donnelly. All rights reserved.
//  originally taken from https://gist.github.com/mattdonnelly/5924492

#import <Accelerate/Accelerate.h>
#import <UIKit/UIKit.h>

@implementation UIImage (vImageScaling)

- (UIImage *)vImageScaledImageWithSize:(CGSize)destSize {
  UIGraphicsBeginImageContext(CGSizeMake(destSize.width, destSize.height));
  [self drawInRect:CGRectMake(0, 0, destSize.width, destSize.height)];
  UIImage *newImage = UIGraphicsGetImageFromCurrentImageContext();
  UIGraphicsEndImageContext();
  return newImage;
}

- (UIImage *)vImageScaledImageWithSize:(CGSize)destSize contentMode:(UIViewContentMode)contentMode {
    CGImageRef sourceRef = [self CGImage];
    NSUInteger sourceWidth = CGImageGetWidth(sourceRef);
    NSUInteger sourceHeight = CGImageGetHeight(sourceRef);
    CGFloat horizontalRatio = destSize.width / sourceWidth;
    CGFloat verticalRatio = destSize.height / sourceHeight;
    CGFloat ratio;

    switch (contentMode) {
        case UIViewContentModeScaleAspectFill:
            ratio = MAX(horizontalRatio, verticalRatio);
            break;

        case UIViewContentModeScaleAspectFit:
            ratio = MIN(horizontalRatio, verticalRatio);
            break;

        default:
            [NSException raise:NSInvalidArgumentException format:@"Unsupported content mode: %d", contentMode];
    }

    CGSize newSize = CGSizeMake(sourceWidth * ratio, sourceHeight * ratio);

    return [self vImageScaledImageWithSize:newSize];
}

@end
