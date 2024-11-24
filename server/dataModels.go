package main

type Models struct {
	Models []Model `json:"models"`
}

type Model struct {
	Name    string      `json:"name"`
	Model   string      `json:"model"`
	Details ModelDetail `json:"details"`
}

type ModelDetail struct {
	ParentModel       string   `json:"parent_model"`
	Format            string   `json:"format"`
	Family            string   `json:"family"`
	Families          []string `json:"families"`
	ParameterSize     string   `json:"parameter_size"`
	QuantizationLevel string   `json:"quantization_level"`
}

type RequestData struct {
	Model    string    `json:"model"`
	Prompt   string    `json:"prompt,omitempty"`
	Messages []Message `json:"messages,omitempty"`
}

type RequestPayload struct {
	Model          string         `json:"model"`
	Prompt         string         `json:"prompt"`
	ChatMessages   []Conversation `json:"conversation,omitempty"`
	IncludeHistory bool           `json:"includeHistory"`
	SystemPrompt   string         `json:"systemPrompt"`
}

type Conversation struct {
	Id       int16  `json:"id"`
	Prompt   string `json:"user"`
	Response string `json:"assistant"`
}

type ResponseData struct {
	Response    string  `json:"response,omitempty"`
	Message     Message `json:"message,omitempty"`
	Model       string  `json:"model"`
	CreatedAt   string  `json:"created_at"`
	Done        bool    `json:"done"`
	CancelToken string  `json:"cancelToken,omitempty"`
}

type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}
