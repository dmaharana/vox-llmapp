package ui

import (
	"embed"
	_ "embed"
)

//go:embed dist/*
var BuildFS embed.FS
