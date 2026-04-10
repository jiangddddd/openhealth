from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = (
        "mysql+pymysql://root:password@127.0.0.1:3306/dream_app?charset=utf8mb4"
    )
    auto_create_tables: bool = True
    auth_token_secret: str = "dev-access-token-secret-change-me"
    auth_token_expire_minutes: int = 43200
    auth_token_issuer: str = "mydream"
    wechat_mini_appid: str = ""
    wechat_mini_secret: str = ""
    qwen_api_key: str = ""
    qwen_base_url: str = "https://dashscope.aliyuncs.com/compatible-mode/v1"
    qwen_model: str = "qwen-plus"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


settings = Settings()
