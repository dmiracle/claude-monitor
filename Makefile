# Claude Monitor - Build Automation
# Usage: make [target]

.PHONY: all clean dev build dist install icon help

# Default target
all: build

# Development mode
dev:
	npm run dev

# Clean build artifacts
clean:
	rm -rf dist/
	rm -rf build/icon.icns
	rm -rf icon.iconset/
	@echo "✅ Cleaned build artifacts"

# Prepare icon files
icon:
	@echo "🎨 Preparing icon files..."
	mkdir -p icon.iconset
	sips -z 16 16 build/icon.png --out icon.iconset/icon_16x16.png
	sips -z 32 32 build/icon.png --out icon.iconset/icon_16x16@2x.png
	sips -z 32 32 build/icon.png --out icon.iconset/icon_32x32.png
	sips -z 64 64 build/icon.png --out icon.iconset/icon_32x32@2x.png
	sips -z 128 128 build/icon.png --out icon.iconset/icon_128x128.png
	sips -z 256 256 build/icon.png --out icon.iconset/icon_128x128@2x.png
	sips -z 256 256 build/icon.png --out icon.iconset/icon_256x256.png
	sips -z 512 512 build/icon.png --out icon.iconset/icon_256x256@2x.png
	sips -z 512 512 build/icon.png --out icon.iconset/icon_512x512.png
	sips -z 1024 1024 build/icon.png --out icon.iconset/icon_512x512@2x.png
	iconutil -c icns icon.iconset -o build/icon.icns
	rm -rf icon.iconset/
	@echo "✅ Icon files ready"

# Build the app
build: icon
	@echo "🔨 Building Electron app..."
	npm run build
	@echo "✅ Build complete"

# Create distributable DMG (same as build for this project)
dist: build
	@echo "📦 DMG created in dist/ directory"

# Install the built app to Applications (macOS only)
install: build
	@echo "📱 Installing Claude Monitor to Applications..."
	@if [ -f "dist/Claude Monitor-1.0.0-arm64.dmg" ]; then \
		open "dist/Claude Monitor-1.0.0-arm64.dmg"; \
		echo "✅ DMG opened - drag app to Applications folder"; \
	else \
		echo "❌ DMG not found. Run 'make build' first."; \
	fi

# Quick rebuild (clean + build)
rebuild: clean build
	@echo "✅ Complete rebuild finished"

# Update icon from source and rebuild
update-icon:
	@echo "🎨 Processing icon with transparency and rounded corners..."
	@if [ -f "claude-monitor-icon.png" ]; then \
		./process-icon.sh claude-monitor-icon.png build/icon.png 512; \
		make icon; \
		echo "✅ Icon updated and processed"; \
	else \
		echo "❌ claude-monitor-icon.png not found"; \
	fi

# Process icon with Python script (more advanced options)
process-icon-py:
	@echo "🎨 Processing icon with Python script..."
	@if command -v python3 >/dev/null 2>&1; then \
		python3 process-icon.py --size 512 --corner-radius 20; \
		make icon; \
	else \
		echo "❌ Python 3 not found. Using shell script instead..."; \
		make update-icon; \
	fi

# Show build info
info:
	@echo "📋 Claude Monitor Build Information"
	@echo "Node version: $$(node --version)"
	@echo "NPM version: $$(npm --version)"
	@echo "Electron version: $$(npm list electron --depth=0 2>/dev/null | grep electron || echo 'Not installed')"
	@echo "Platform: $$(uname -s)"
	@echo "Architecture: $$(uname -m)"
	@ls -la dist/ 2>/dev/null || echo "No build artifacts found"

# Help target
help:
	@echo "🚀 Claude Monitor Build System"
	@echo ""
	@echo "Available targets:"
	@echo "  dev          - Run in development mode"
	@echo "  build        - Build the Electron app and create DMG"
	@echo "  dist         - Same as build (create distributable)"
	@echo "  clean        - Remove build artifacts"
	@echo "  rebuild      - Clean and build from scratch"
	@echo "  icon         - Generate icon files from PNG"
	@echo "  update-icon  - Update icon from source PNG and regenerate"
	@echo "  install      - Open DMG for installation"
	@echo "  info         - Show build environment info"
	@echo "  help         - Show this help message"
	@echo ""
	@echo "Examples:"
	@echo "  make build   - Build the app"
	@echo "  make clean   - Clean build files"
	@echo "  make rebuild - Clean and rebuild everything"