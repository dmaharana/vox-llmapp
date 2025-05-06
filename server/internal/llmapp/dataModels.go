package llmapp

type (
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
		Model    string         `json:"model"`
		Prompt   string         `json:"prompt,omitempty"`
		Raw      bool           `json:"raw" default:"false"`
		Messages []Message      `json:"messages,omitempty"`
		Stream   bool           `json:"stream" default:"true"`
		Options  RequestOptions `json:"options,omitempty"`
	}

	RequestOptions struct {
		NumKeep     int     `json:"num_keep,omitempty"`
		Seed        int     `json:"seed,omitempty"`
		Temperature float32 `json:"temperature,omitempty"`
		NumContext  int     `json:"num_ctx,omitempty"`
		NumBatch    int     `json:"num_batch,omitempty"`
	}

	RequestPayload struct {
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
	}

	Conversation struct {
		Id       int16  `json:"id"`
		Model    string `json:"model"`
		Prompt   string `json:"user"`
		Response string `json:"assistant"`
	}

	ResponseData struct {
		Response    string  `json:"response,omitempty"`
		Message     Message `json:"message,omitempty"`
		Model       string  `json:"model"`
		CreatedAt   string  `json:"created_at"`
		Done        bool    `json:"done"`
		CancelToken string  `json:"cancelToken,omitempty"`
	}

	Message struct {
		Role    string `json:"role,omitempty"`
		Content string `json:"content,omitempty"`
	}
)

// model setting defaults
const (
	defaultTemperature = 0.7
	defaultNumContext  = 2048
	defaultNumBatch    = 1
	defaultNumKeep     = 5
	defaultSeed        = 42
)

// provider URL
var (
	ProviderURLs = map[string]string{
		"openrouter": "https://openrouter.ai/api/v1",
		"groq":       "https://api.groq.com/openai/v1",
		"gemini":     "https://generativelanguage.googleapis.com/v1beta/openai",
		"ollama":     "http://localhost:11434",
	}

	ProviderModelURLs = map[string]string{
		"openrouter": "%s/models",
		"groq":       "%s/models",
		"gemini":     "%s/models",
		"ollama":     "%s/v1/models",
	}
)
