package llmapp

const (
	// MessageRoleSystem is the role of the system message
	MessageRoleSystem = "system"
	// MessageRoleUser is the role of the user message
	MessageRoleUser = "user"
	// MessageRoleAssistant is the role of the assistant message
	MessageRoleAssistant = "assistant"

	// provider and model separator
	ProviderModelSeparator = "/"

	// LLM providers
	ProviderOllama     = "ollama"
	ProviderOpenRouter = "openrouter"
	ProviderGroq       = "groq"
	ProviderGemini     = "gemini"
)
