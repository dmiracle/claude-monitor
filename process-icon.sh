#!/bin/bash
# Icon Processing Script for Claude Monitor
# Crops whitespace and creates clean transparent icons

set -e  # Exit on error

INPUT_FILE="${1:-claude-monitor-icon.png}"
OUTPUT_FILE="${2:-build/icon.png}"
SIZE="${3:-512}"

echo "🎨 Processing icon: $INPUT_FILE → $OUTPUT_FILE"

# Check if input file exists
if [ ! -f "$INPUT_FILE" ]; then
    echo "❌ Input file not found: $INPUT_FILE"
    exit 1
fi

# Create output directory
mkdir -p "$(dirname "$OUTPUT_FILE")"

# Check if ImageMagick is installed
if ! command -v magick &> /dev/null; then
    echo "❌ ImageMagick not found. Install with: brew install imagemagick"
    exit 1
fi

echo "✂️  Step 1: Trimming whitespace..."
magick "$INPUT_FILE" -trim +repage /tmp/icon-trimmed.png

echo "🎨 Step 2: Making white background transparent..."
magick /tmp/icon-trimmed.png -fuzz 5% -transparent white /tmp/icon-transparent.png

echo "🔄 Step 3: Adding rounded corners..."
# Create a rounded mask
magick -size ${SIZE}x${SIZE} xc:none -draw "roundrectangle 0,0 $((SIZE-1)),$((SIZE-1)) 20,20" /tmp/mask.png

echo "📐 Step 4: Resizing and applying mask..."
magick /tmp/icon-transparent.png \
    -resize ${SIZE}x${SIZE} \
    -gravity center \
    -extent ${SIZE}x${SIZE} \
    /tmp/mask.png \
    -alpha off \
    -compose CopyOpacity \
    -composite \
    "$OUTPUT_FILE"

# Optional: Add subtle shadow
if [ "$4" = "--shadow" ]; then
    echo "🌑 Step 5: Adding drop shadow..."
    magick "$OUTPUT_FILE" \
        \( +clone -background black -shadow 60x3+3+3 \) \
        +swap -background none -layers merge +repage \
        "$OUTPUT_FILE"
fi

# Clean up temp files
rm -f /tmp/icon-trimmed.png /tmp/icon-transparent.png /tmp/mask.png

# Show file info
INPUT_SIZE=$(stat -f%z "$INPUT_FILE" 2>/dev/null || stat -c%s "$INPUT_FILE" 2>/dev/null || echo "unknown")
OUTPUT_SIZE=$(stat -f%z "$OUTPUT_FILE" 2>/dev/null || stat -c%s "$OUTPUT_FILE" 2>/dev/null || echo "unknown")

echo "✅ Icon processing complete!"
echo "📊 File size: $INPUT_SIZE → $OUTPUT_SIZE bytes"
echo "📏 Final size: ${SIZE}x${SIZE} pixels"
echo ""
echo "🎉 Ready to use! Now run: make icon"