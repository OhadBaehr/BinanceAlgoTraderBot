# Binance Algo Trader Bot
Someday this will be a fully automatic Trading Bot, for now, quite a nice Boilerplate if you are thinking about making one.

## Roadmap:
1) Collect Data about tokens on Binance ✓ 
2) Calculate Technical Indicators (doesn't require a lot of additional work, Bollinger Bands and RSI is ready)
3) Find a profitable tactic (thinking about calculating the slope of the middle of the Bollinger Bands and buying when the RSI is low and the slope is straight or pointing upwards


## How to use:
Create a .env file in the same folder as the .js file and type in this information:

    APIKEY= your_binance_api_hash
    APISECRET= your_binance_api_id
    CURRENCIES= "USDT,BUSD"

you can get an API key and secret from your Binance profile settings,
"CURRENCIES" will be the tokens you want to make more of, you can set it to BTC or ADA for example to get more of those tokens.

now run the code by typing in your terminal:

    node BinanceAlgoTrading.js

It wouldn't do much for now, only gather data about coins, but hopefully this bot will be completed soon when I have more time to work on it, for discussing profitable technical analysis that the bot may use to conduct trades please open an issue, every suggestion is welcome.
