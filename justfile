# Export justfile variables as environment variables

set export := true


# Define constants
app_name := "llmapp"
app_version := "0.0.1"
userinterface_subdir := "userinterface"
server_subdir := "server"
release_subdir := "release"
ui_dist_dir := "userinterface/dist"
server_dist_dir := "server/dist"
linux_bin := "llmapp"
windows_bin := "llmapp.exe"

# define alias

alias b := build
alias c := clean
alias s := buildserver
alias u := buildui
alias z := createarchive
alias r := release

default:
    @just --list

buildui:
    @echo "Building UI..."
    @cd {{userinterface_subdir}} && bun install
    @cd {{userinterface_subdir}} && bun run build
    @rm -Rf {{server_dist_dir}}
    @cp -r '{{ ui_dist_dir }}' '{{ server_subdir }}' 
    @echo "Building UI Done!"

buildserver:
    @echo "Building server..."
    @cd {{server_subdir}} && rm {{linux_bin}} {{windows_bin}}
    @cd {{server_subdir}} && go mod tidy
    @cd {{server_subdir}} && GOOS=linux GOARCH=amd64 go build -o {{linux_bin}}
    @cd {{server_subdir}} && GOOS=windows GOARCH=amd64 go build -o {{windows_bin}}
    @echo "Building server Done!"

build:
    @just buildui buildserver

createarchive:
    @echo "Creating archive..."
    @cd {{server_subdir}} && zip -r {{app_name}}-{{app_version}}.zip {{windows_bin}}
    @cd {{server_subdir}} && tar -czvf {{app_name}}-{{app_version}}.tar.gz {{linux_bin}}
    @echo "Creating archive Done!"

release:
    @echo "Releasing..."
    @mkdir -p {{release_subdir}}
    @just createarchive
    @mv {{server_subdir}}/{{app_name}}-{{app_version}}.zip {{release_subdir}}
    @mv {{server_subdir}}/{{app_name}}-{{app_version}}.tar.gz {{release_subdir}}
    @echo "Releasing Done!"

clean:
    @rm -Rf {{server_dist_dir}}
    @rm -Rf {{ui_dist_dir}}
    @rm -Rf {{zip_name}}
    @rm -Rf {{tar_name}}