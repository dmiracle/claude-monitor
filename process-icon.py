#!/usr/bin/env python3
"""
Icon Processing Script for Claude Monitor
Crops whitespace and makes corners transparent for a clean icon appearance.
"""

import os
import sys
from PIL import Image, ImageChops, ImageDraw
import argparse

def crop_whitespace(image):
    """Crop whitespace from image edges"""
    # Convert to RGBA if not already
    if image.mode != 'RGBA':
        image = image.convert('RGBA')
    
    # Create a white background of same size
    bg = Image.new('RGBA', image.size, (255, 255, 255, 0))
    
    # Get the alpha channel
    alpha = image.split()[-1]
    
    # Get difference between image and transparent background using alpha
    bbox = alpha.getbbox()
    
    if bbox:
        # Crop to bounding box with some padding
        padding = 10
        left = max(0, bbox[0] - padding)
        top = max(0, bbox[1] - padding)
        right = min(image.size[0], bbox[2] + padding)
        bottom = min(image.size[1], bbox[3] + padding)
        
        cropped = image.crop((left, top, right, bottom))
        return cropped
    else:
        return image

def make_corners_transparent(image, corner_radius=20):
    """Make corners transparent with rounded effect"""
    # Ensure image is RGBA
    if image.mode != 'RGBA':
        image = image.convert('RGBA')
    
    # Create a mask with rounded corners
    mask = Image.new('L', image.size, 0)
    draw = ImageDraw.Draw(mask)
    
    # Draw rounded rectangle (white = opaque, black = transparent)
    draw.rounded_rectangle(
        [(0, 0), image.size],
        radius=corner_radius,
        fill=255
    )
    
    # Apply mask to image
    output = Image.new('RGBA', image.size, (0, 0, 0, 0))
    output.paste(image, (0, 0))
    output.putalpha(mask)
    
    return output

def remove_white_background(image, fuzz_threshold=10):
    """Remove white/near-white background and make it transparent"""
    if image.mode != 'RGBA':
        image = image.convert('RGBA')
    
    data = image.getdata()
    new_data = []
    
    for item in data:
        # Check if pixel is close to white
        r, g, b, a = item
        if (r > 255 - fuzz_threshold and 
            g > 255 - fuzz_threshold and 
            b > 255 - fuzz_threshold):
            # Make white pixels transparent
            new_data.append((r, g, b, 0))
        else:
            # Keep non-white pixels
            new_data.append(item)
    
    image.putdata(new_data)
    return image

def add_subtle_shadow(image):
    """Add a subtle drop shadow effect"""
    # Create shadow layer
    shadow = Image.new('RGBA', 
                      (image.size[0] + 10, image.size[1] + 10), 
                      (0, 0, 0, 0))
    
    # Create shadow mask
    shadow_mask = Image.new('RGBA', image.size, (0, 0, 0, 60))  # Semi-transparent black
    
    # Apply image alpha to shadow
    if image.mode == 'RGBA':
        alpha = image.split()[-1]
        shadow_mask.putalpha(alpha)
    
    # Paste shadow slightly offset
    shadow.paste(shadow_mask, (3, 3), shadow_mask)
    
    # Paste original image on top
    shadow.paste(image, (0, 0), image)
    
    return shadow

def process_icon(input_path, output_path, options):
    """Main processing function"""
    try:
        # Open the image
        print(f"📖 Loading image: {input_path}")
        image = Image.open(input_path)
        
        # Show original dimensions
        print(f"📏 Original size: {image.size}")
        
        # Remove white background first
        if options.get('remove_white', True):
            print("🎨 Removing white background...")
            image = remove_white_background(image, options.get('fuzz', 10))
        
        # Crop whitespace
        if options.get('crop', True):
            print("✂️  Cropping whitespace...")
            original_size = image.size
            image = crop_whitespace(image)
            print(f"📏 After crop: {image.size} (saved {original_size[0] - image.size[0]}x{original_size[1] - image.size[1]} pixels)")
        
        # Make corners transparent
        if options.get('round_corners', True):
            print(f"🔄 Making corners transparent (radius: {options.get('corner_radius', 20)})...")
            image = make_corners_transparent(image, options.get('corner_radius', 20))
        
        # Add shadow effect
        if options.get('shadow', False):
            print("🌑 Adding subtle shadow...")
            image = add_subtle_shadow(image)
        
        # Resize if requested
        if options.get('size'):
            target_size = options['size']
            print(f"📐 Resizing to {target_size}x{target_size}...")
            # Use high-quality resampling
            image = image.resize((target_size, target_size), Image.Resampling.LANCZOS)
        
        # Save the processed image
        print(f"💾 Saving processed image: {output_path}")
        image.save(output_path, 'PNG', optimize=True)
        
        # Show file size info
        input_size = os.path.getsize(input_path)
        output_size = os.path.getsize(output_path)
        print(f"📊 File size: {input_size:,} → {output_size:,} bytes ({output_size/input_size:.1%})")
        
        print("✅ Icon processing complete!")
        return True
        
    except Exception as e:
        print(f"❌ Error processing icon: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description='Process icon for Claude Monitor app')
    parser.add_argument('input', nargs='?', default='claude-monitor-icon.png', 
                      help='Input image file (default: claude-monitor-icon.png)')
    parser.add_argument('output', nargs='?', default='build/icon.png',
                      help='Output image file (default: build/icon.png)')
    parser.add_argument('--size', type=int, default=512,
                      help='Target size in pixels (default: 512)')
    parser.add_argument('--corner-radius', type=int, default=20,
                      help='Corner radius for transparency (default: 20)')
    parser.add_argument('--fuzz', type=int, default=10,
                      help='Fuzz threshold for white removal (default: 10)')
    parser.add_argument('--no-crop', action='store_true',
                      help='Skip whitespace cropping')
    parser.add_argument('--no-corners', action='store_true',
                      help='Skip corner transparency')
    parser.add_argument('--no-white-removal', action='store_true',
                      help='Skip white background removal')
    parser.add_argument('--shadow', action='store_true',
                      help='Add subtle drop shadow')
    
    args = parser.parse_args()
    
    # Check if input file exists
    if not os.path.exists(args.input):
        print(f"❌ Input file not found: {args.input}")
        sys.exit(1)
    
    # Create output directory if needed
    os.makedirs(os.path.dirname(args.output), exist_ok=True)
    
    # Process options
    options = {
        'size': args.size,
        'corner_radius': args.corner_radius,
        'fuzz': args.fuzz,
        'crop': not args.no_crop,
        'round_corners': not args.no_corners,
        'remove_white': not args.no_white_removal,
        'shadow': args.shadow
    }
    
    # Process the icon
    success = process_icon(args.input, args.output, options)
    
    if not success:
        sys.exit(1)
    
    print(f"\n🎉 Ready to use! Now run: make icon")

if __name__ == '__main__':
    main()