const Binance = require('node-binance-api')
const signals = require('technicalindicators')
const { RSI, BollingerBands } = signals
const BB=BollingerBands
const v8 = require('v8');
require('dotenv').config()



/*
    Helpers
*/
const deepClone = obj => {
    return v8.deserialize(v8.serialize(obj));
};

const extractColumn = (arr, column) => arr.map(x => x[column]);

function renameKeys(obj, newKeys) {
    const keyValues = Object.keys(obj).map(key => {
        const newKey = newKeys[key] || key;
        return { [newKey]: obj[key] };
    });
    return Object.assign({}, ...keyValues);
}




/*
    Authenticate and fix timezone
*/
const binance = new Binance().options({
    APIKEY: process.env.APIKEY,
    APISECRET: process.env.APISECRET,
    useServerTime: true,
})



/*
    Globals
*/
const CURRENCIES = process.env.CURRENCIES.toUpperCase().replace(/\s/g, '').split(",").reduce((acc, curr) => (acc[curr] = {}, acc), {});
const COINS = {}
const TODAY = new Date().setDate(new Date().getDate())
const EMPTY = {
    open: [],
    high: [],
    low: [],
    close: [],
    volume: [],
    trades: [],
    interval: [],
    isFinal: [],
    quoteVolume: [],
    buyVolume: [],
    quoteBuyVolume: [],
    price3m: [],
    rsi: [],
    bb: []
}
const DATA = {
    time: 0,
    open: 1,
    high: 2,
    low: 3,
    close: 4,
    volume: 5,
    closeTime: 6,
    assetVolume: 7,
    trades: 8,
    buyBaseVolume: 9,
    buyAssetVolume: 10,
    ignored: 11
}

let LIVE = {}
const BOUGHT = {}
const STABLECOINS=['DAI','BUSD','USDT','USDC']
const MARGIN=0.02 // distance from BollingerBands walls

/*
    Bot stuff
*/
// get balance of coins declared as currencies (currencies are used to buy other tokens)
binance.useServerTime(() => {
    binance.balance((error, response) => {
        Object.keys(CURRENCIES).map(currency => {
            if (response[currency].available) CURRENCIES[currency] = response[currency]
        })
        initCoinList()
    })
});

// find coins with currency pairs
function initCoinList() {
    binance.bookTickers((error, ticker) => {
        ticker.map((data) => {
            Object.keys(CURRENCIES).map((currency) => {
                if (data.symbol.includes(currency)) COINS[data.symbol] = { ...EMPTY }
            })
        })
        obtainHistoricData()
    })
}


function obtainHistoricData() {
    let promiseArray = []
    Object.keys(COINS).map((coin) => {
        promiseArray.push(
            new Promise(
                function (resolve, reject) {
                    binance.candlesticks(coin, "15m", (error, ticks, symbol) => {
                        if (error) delete COINS[symbol]
                        else {
                            Object.keys(COINS[symbol]).map((data, index) => {
                                if (data in DATA){
                                    COINS[symbol][data] = extractColumn(ticks, [DATA[data]]).map(Number)
                                }
                            })
                        }

                        resolve()
                    }, { limit: 900, endTime: TODAY })
                }
            )
        )
    })
    Promise.all(promiseArray).then(() => calcIndicatorsAndTrade())
}





function calcIndicatorsAndTrade() {
    LIVE = deepClone(COINS)
    binance.websockets.candlesticks(Object.keys(COINS), "15m", (candlesticks) => {
        let { e: eventType, E: eventTime, s: symbol, k: ticks } = candlesticks;
        ticks = renameKeys(ticks, { o: "open", h: "high", l: "low", c: "close", v: "volume", n: "trades", i: "interval", x: "isFinal", q: "quoteVolume", V: "buyVolume", Q: "quoteBuyVolume" })
        Object.keys(LIVE[symbol]).map((data) => {
            const length = COINS[symbol][data].length
            COINS[symbol][data][length - 1] = parseFloat(ticks[data])
            if (ticks[data]) LIVE[symbol][data].push(parseFloat(ticks[data]))
            if (LIVE[symbol][data].length > 1000) LIVE[symbol][data].shift()
        })
        COINS[symbol].rsi = RSI.calculate({ values: COINS[symbol].close, period: 6 })
        COINS[symbol].bb = BB.calculate({ values: COINS[symbol].close, period: 6,stdDev:2 })
        const lastClose = COINS[symbol].close[COINS[symbol].close.length - 1]
        const lastRSI = COINS[symbol].rsi[COINS[symbol].rsi.length - 1]
        const lastBB = COINS[symbol].bb[COINS[symbol].bb.length - 1]
        // console.log(symbol,lastRSI,lastBB,lastClose)
        if (lastRSI < 28 && !(symbol in BOUGHT) && lastBB.lower * (1 - MARGIN)  > lastClose) considerBuying(symbol)
        if (lastRSI > 71 && (symbol in BOUGHT) && lastBB.upper * (1 + MARGIN) < lastClose) considerSelling(symbol)
        // console.log(symbol, COINS[symbol].close[COINS[symbol].close.length - 1], COINS[symbol].rsi[COINS[symbol].rsi.length - 1])
        // console.log(symbol, COINS[symbol].close, COINS[symbol].bb)
        if (ticks.isFinal) {
            Object.keys(COINS[symbol]).map((data) => {
                const length = LIVE[symbol][data].length
                COINS[symbol][data].push(LIVE[symbol][data][length - 1])
                if (COINS[symbol][data].length > 1000) COINS[symbol][data].shift()
            })
        }
    });
}


async function considerBuying(symbol) {
    console.log("bought",symbol, COINS[symbol].close[COINS[symbol].close.length - 1],COINS[symbol].rsi[COINS[symbol].rsi.length - 1],COINS[symbol].bb[COINS[symbol].bb.length - 1].lower)
    BOUGHT[symbol] = true
}


async function considerSelling(symbol) {
    console.log("sold",symbol, COINS[symbol].close[COINS[symbol].close.length - 1],COINS[symbol].rsi[COINS[symbol].rsi.length - 1],COINS[symbol].bb[COINS[symbol].bb.length - 1].lower)
}