package llmapp

type ChatCompletionResponse struct {
	ID                string              `json:"id"`
	Object           string              `json:"object"`
	Created          int64               `json:"created"`
	Model            string              `json:"model"`
	SystemFP         string              `json:"system_fingerprint"`
	Choices          []CompletionChoice  `json:"choices"`
}

type CompletionChoice struct {
	Index        int                  `json:"index"`
	Delta        CompletionDelta      `json:"delta"`
	FinishReason *string             `json:"finish_reason"`
}

type CompletionDelta struct {
	Role    string `json:"role,omitempty"`
	Content string `json:"content,omitempty"`
}

type ChatCompletionError struct {
	Error struct {
		Message string `json:"message"`
		Type    string `json:"type"`
		Code    string `json:"code"`
	} `json:"error"`
}