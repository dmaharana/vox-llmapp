# Application constants
APP_NAME := llmapp
APP_VERSION := 0.0.1
USERINTERFACE_SUBDIR := userinterface
SERVER_SUBDIR := server
RELEASE_SUBDIR := release
SSL_DIR := sslcerts
ENV_FILE := .env
UI_DIST_DIR := userinterface/dist
SERVER_DIST_DIR := server/dist
LINUX_BIN := llmapp
WINDOWS_BIN := llmapp.exe

.PHONY: all buildui buildserver build createarchive release clean b c s u z r

# Shortcuts/Aliases
b: build
c: clean
s: buildserver
u: buildui
z: createarchive
r: release

# Default target
all: help

help:
	@echo "Available targets:"
	@echo "  buildui (u)  - Build the UI components"
	@echo "  buildserver (s) - Build the server components"
	@echo "  build (b)   - Build both UI and server"
	@echo "  createarchive (z) - Create distribution archives"
	@echo "  release (r) - Create release packages"
	@echo "  clean (c)   - Clean build artifacts"

buildui:
	@echo "Building UI..."
	cd $(USERINTERFACE_SUBDIR) && bun install
	cd $(USERINTERFACE_SUBDIR) && bun run build
	rm -Rf $(SERVER_DIST_DIR)
	cp -r $(UI_DIST_DIR) $(SERVER_SUBDIR)
	@echo "Building UI Done!"

buildserver:
	@echo "Building server..."
	cd $(SERVER_SUBDIR) && go mod tidy
	cd $(SERVER_SUBDIR) && GOOS=linux GOARCH=amd64 go build -o $(LINUX_BIN)
	cd $(SERVER_SUBDIR) && GOOS=windows GOARCH=amd64 go build -o $(WINDOWS_BIN)
	@echo "Building server Done!"

build: buildui buildserver

createarchive:
	@echo "Creating archive..."
	cd $(SERVER_SUBDIR) && zip -r $(APP_NAME)-$(APP_VERSION).zip $(WINDOWS_BIN) $(ENV_FILE) $(SSL_DIR)
	cd $(SERVER_SUBDIR) && tar -czvf $(APP_NAME)-$(APP_VERSION).tar.gz $(LINUX_BIN) $(ENV_FILE) $(SSL_DIR)
	@echo "Creating archive Done!"

release:
	@echo "Releasing..."
	mkdir -p $(RELEASE_SUBDIR)
	$(MAKE) createarchive
	mv $(SERVER_SUBDIR)/$(APP_NAME)-$(APP_VERSION).zip $(RELEASE_SUBDIR)
	mv $(SERVER_SUBDIR)/$(APP_NAME)-$(APP_VERSION).tar.gz $(RELEASE_SUBDIR)
	@echo "Releasing Done!"

clean:
	rm -Rf $(SERVER_DIST_DIR)
	rm -Rf $(UI_DIST_DIR)
	rm -Rf $(APP_NAME)-$(APP_VERSION).zip
	rm -Rf $(APP_NAME)-$(APP_VERSION).tar.gz
