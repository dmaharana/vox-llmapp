package appenv

import (
	"github.com/caarlos0/env/v6"
	"github.com/joho/godotenv"
	"log"
)

type AppEnv struct {
	LlmUrl  string `env:"LLM_URL"`
	AppPort string `env:"APP_PORT"`
}

const configFile = ".env"

// read config file from configFile and return Config
func ReadConfig() (AppEnv, error) {
	var c AppEnv

	err := godotenv.Load(configFile)
	if err != nil {
		// log.Fatal("Error loading .env file")
		return c, err
	}

	// Parse the environment variables into the Config struct
	if err := env.Parse(&c); err != nil {
		return c, err
	}

	log.Printf("Config: %+v", c)
	return c, nil
}
