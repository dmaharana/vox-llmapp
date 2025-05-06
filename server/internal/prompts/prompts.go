package prompts

import (
	"encoding/json"
	"log"
	"os"
)

type Prompt struct {
	Name    string `json:"name"`
	Content string `json:"content"`
}

var (
	DefaultPrompts = `[
			{
				"name": "Default Assistant",
				"content": "You are a helpful assistant. Answer as concisely as possible."
			},
			{
				"name": "Code Expert", 
				"content": "You are an expert programmer. Provide code examples and explanations."
			},
			{
				"name": "Creative Writer",
				"content": "You are a creative writer. Provide imaginative and detailed responses."
			}
		]
`
)

// if PromptsFile exists, read it, otherwise use DefaultPrompts
func GetPrompts(promptsFile string) []Prompt {
	log.Println("Prompts file:", promptsFile)

	prompts := []Prompt{}
	// set default prompts
	err := json.Unmarshal([]byte(DefaultPrompts), &prompts)
	if err != nil {
		log.Println("Error unmarshalling default prompts:", err)
		return prompts
	}

	if promptsFile == "" {
		return prompts
	}

	// read prompts file
	if _, err := os.Stat(promptsFile); err == nil {
		data, err := os.ReadFile(promptsFile)
		if err != nil {
			log.Println("Error reading prompts file:", err)
			return prompts
		}
		if err := json.Unmarshal(data, &prompts); err != nil {
			log.Println("Error unmarshalling prompts:", err)
			return prompts
		}
		return prompts
	}
	return prompts
}
