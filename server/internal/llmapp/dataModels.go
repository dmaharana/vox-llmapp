package llmapp

import "sync"

type (
	StreamChatCompletionResponse struct {
		ID       string                   `json:"id"`
		Object   string                   `json:"object"`
		Created  int64                    `json:"created"`
		Model    string                   `json:"model"`
		SystemFP string                   `json:"system_fingerprint"`
		Choices  []StreamCompletionChoice `json:"choices"`
	}

	StreamCompletionChoice struct {
		Index        int             `json:"index"`
		Delta        CompletionDelta `json:"delta"`
		FinishReason *string         `json:"finish_reason"`
	}

	CompletionDelta struct {
		Role    string `json:"role,omitempty"`
		Content string `json:"content,omitempty"`
	}

	ChatCompletionResponse struct {
		ID      string   `json:"id"`
		Object  string   `json:"object"`
		Created int64    `json:"created"`
		Model   string   `json:"model"`
		SystemFP string   `json:"system_fingerprint"`
		Choices []Choice `json:"choices"`
		Usage   Usage    `json:"usage"`
	}

	ChatCompletionError struct {
		Error struct {
			Message string `json:"message"`
			Type    string `json:"type"`
			Code    string `json:"code"`
		} `json:"error"`
	}

	CompletionChoice struct {
		Index        int                  `json:"index"`
		Delta        CompletionDelta      `json:"delta"`
		FinishReason *string             `json:"finish_reason"`
	}



	// openai complaint models
	OpenAIModels struct {
		Data []OpenAIModel `json:"data"`
	}

	OpenAIModel struct {
		ID           string `json:"id"`
		Name         string `json:"name"`
		Architecture struct {
			Modality string `json:"modality"`
		} `json:"architecture"`
		Pricing struct {
			Prompt     string `json:"prompt"`
			Completion string `json:"completion"`
		}
	}

	// ollama models
	Models struct {
		Models []Model `json:"models"`
	}

	Model struct {
		Name    string      `json:"name"`
		Model   string      `json:"model"`
		Details ModelDetail `json:"details"`
	}

	ModelDetail struct {
		ParentModel       string   `json:"parent_model"`
		Format            string   `json:"format"`
		Family            string   `json:"family"`
		Families          []string `json:"families"`
		ParameterSize     string   `json:"parameter_size"`
		QuantizationLevel string   `json:"quantization_level"`
	}

	RequestData struct {
		Model  string `json:"model"`
		Prompt string `json:"prompt,omitempty"`
		// Raw      bool      `json:"raw" default:"true"`
		Messages []Message `json:"messages,omitempty"`
		Stream   bool      `json:"stream" default:"true"`
		// Options     RequestOptions `json:"options,omitempty"`
		Temperature float32 `json:"temperature,omitempty"`
		Seed        int     `json:"seed,omitempty"`
	}

	RequestOptions struct {
		NumKeep     int     `json:"num_keep,omitempty"`
		Seed        int     `json:"seed,omitempty"`
		Temperature float32 `json:"temperature,omitempty"`
		NumContext  int     `json:"num_ctx,omitempty"`
		NumBatch    int     `json:"num_batch,omitempty"`
	}

	RequestPayload struct {
		ProviderName   string         `json:"providerName"`
		ProviderURL    string         `json:"providerUrl"`
		Model          string         `json:"model"` // if other than ollama, then the provider will be prepended
		Prompt         string         `json:"prompt"`
		Raw            bool           `json:"raw,omitempty"`
		ChatMessages   []Conversation `json:"conversation,omitempty"`
		IncludeHistory bool           `json:"includeHistory"`
		SystemPrompt   string         `json:"systemPrompt"`
		Stream         bool           `json:"stream,omitempty"`
		Temperature    float32        `json:"temperature,omitempty"`
		NumContext     int            `json:"num_ctx,omitempty"`
		CancelToken    string         `json:"cancelToken,omitempty"`
	}

	Conversation struct {
		Id       int16  `json:"id"`
		Model    string `json:"model"`
		Prompt   string `json:"user"`
		Response string `json:"assistant"`
	}

	ResponseData struct {
		Response    string   `json:"response,omitempty"`
		Model       string   `json:"model"`
		Choices     []Choice `json:"choices,omitempty"`
		CreatedAt   string   `json:"created_at"`
		Done        bool     `json:"done"`
		Usage       Usage    `json:"usage"`
		CancelToken string   `json:"cancelToken,omitempty"`
	}

	Message struct {
		Role    string `json:"role,omitempty"`
		Content string `json:"content,omitempty"`
	}

	Choice struct {
		Index   int16   `json:"index"`
		Message Message `json:"message"`
	}

	Usage struct {
		PromptTokens     int16 `json:"prompt_tokens"`
		CompletionTokens int16 `json:"completion_tokens"`
		TotalTokens      int16 `json:"total_tokens"`
	}

	SupportedProvider struct {
		ProviderId   string `json:"provider_id"`
		Name         string `json:"name"`
		ProviderName string `json:"provider_name"`
		Endpoint     string `json:"endpoint"`
		APIKey       string `json:"api_key"`
	}

	// LLMResponse represents a response sent back through the channel
	LLMResponse struct {
		ID         string
		Data       ResponseData
		IsStream   bool
		IsComplete bool
		Error      *LLMError
	}

	// LLMError represents a structured error response
	LLMError struct {
		Message string `json:"message"`
		Type    string `json:"type"`
		Code    string `json:"code"`
	}
)

// model setting defaults
const (
	defaultTemperature = 0.7
	defaultNumContext  = 204800
	defaultNumBatch    = 1
	defaultNumKeep     = 5
	defaultSeed        = 42
)

// provider URL
var (
	ProviderURLs = map[string]string{
		"openrouter": "https://openrouter.ai",
		"groq":       "https://api.groq.com",
		"gemini":     "https://generativelanguage.googleapis.com",
		"ollama":     "http://localhost:11434",
	}

	ProviderModelURLs = map[string]string{
		"openrouter": "%s/api/v1/models",
		"groq":       "%s/openai/v1/models",
		"gemini":     "%s/v1beta/openai/models",
		"ollama":     "%s/v1/models",
	}

	ProviderChatURLs = map[string]string{
		"openrouter": "%s/api/v1/chat/completions",
		"groq":       "%s/openai/v1/chat/completions",
		"gemini":     "%s/v1beta/openai/chat/completions",
		"ollama":     "%s/v1/chat/completions",
	}

	ProviderGenerateURLs = map[string]string{
		"openrouter": "%s/api/v1/chat/completions",
		"groq":       "%s/openai/v1/chat/completions",
		"gemini":     "%s/v1beta/openai/chat/completions",
		"ollama":     "%s/api/generate",
	}

	SupportedProviders = []SupportedProvider{
		{ProviderId: "ollama", Name: "Ollama", ProviderName: "Ollama", Endpoint: "http://localhost:11434"},
		{ProviderId: "openrouter", Name: "OpenRouter", ProviderName: "OpenRouter", Endpoint: "https://openrouter.ai/api/v1", APIKey: ""},
		{ProviderId: "groq", Name: "Groq", ProviderName: "Groq", Endpoint: "https://api.groq.com/openai/v1", APIKey: ""},
		{ProviderId: "gemini", Name: "Gemini", ProviderName: "Gemini", Endpoint: "https://generativelanguage.googleapis.com/v1beta/openai", APIKey: ""},
		{ProviderId: "customOpenAI", Name: "Custom OpenAI Compatible", ProviderName: "OpenAI Compatible", Endpoint: "", APIKey: ""},
	}

	DefaultProvider = "ollama"

	AuthorizationHeader = "X-Api-Key"
)

// Channel-based communication types
type (
	// LLMRequest represents a request sent through the channel
	LLMRequest struct {
		ID             string         `json:"id"`
		RequestPayload RequestPayload `json:"request_payload"`
		APIKey         string         `json:"api_key"`
		ResponseChan   chan LLMResponse
		ErrorChan      chan error
		CancelChan     chan bool
		CancelToken    string `json:"cancel_token"`
	}

	// LLMWorker represents a single worker
	LLMWorker struct {
		ID       int
		requests chan LLMRequest
		quit     chan bool
		wg       *sync.WaitGroup
	}

	// LLMWorkerPool manages the worker goroutines
	LLMWorkerPool struct {
		RequestChan chan LLMRequest
		Workers     int
		QuitChan    chan bool
		workers     []*LLMWorker
		wg          *sync.WaitGroup
	}
)
