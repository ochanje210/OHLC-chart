import { SERVER_URL } from 'public/constants';
import { Bar, DatafeedConfiguration, IBasicDataFeed, LibrarySymbolInfo } from '../chartingLibrary/charting_library.min';
import { subscribeOnStream, unsubscribeFromStream } from './streaming';

let lastBarCache: Bar;

const configurationData: DatafeedConfiguration = {
	supported_resolutions: ['1'],
};

const symbolInfo: LibrarySymbolInfo = {
	name: 'BTC/KRW',
	description: 'BTC/KRW',
	type: 'bitcoin',
	session: "24x7",
	timezone: 'Asia/Seoul',
	exchange: '빗썸',
	minmov: 1,
	pricescale: 100,
	has_intraday: true,
	supported_resolutions: configurationData.supported_resolutions,
	volume_precision: 2,
	data_status: 'streaming',
	full_name: '빗썸 BTC/KRW',
	listed_exchange: '빗썸',
	format: 'price'
};

async function getHisotricCandlesticks() {
	try {
		const res = await fetch(`http://${SERVER_URL}/historic`, {
			method: 'GET'
		})
		return res.json()
	} catch(err) {
		throw Error(`getHisotricCandlesticks Error::${err.message}`)
	}
}

export const datafeed: IBasicDataFeed = {
	onReady: (callback) => {
	  console.log('[onReady]: Method call');
	  setTimeout(() => callback(configurationData));
	},
	searchSymbols: async (userInput, exchange, symbolType, onResultReadyCallback) => {
	  console.log('[searchSymbols]: Method call');
	},
	resolveSymbol: async (symbolName, onSymbolResolvedCallback, onResolveErrorCallback) => {
	  console.log('[resolveSymbol]: Method call', symbolName);
	  onSymbolResolvedCallback(symbolInfo);
	},
	getBars: async (symbolInfo, resolution, from, to, onHistoryCallback, onErrorCallback, firstDataRequest) => {
		console.log('[getBars]: Method call', symbolInfo, resolution, from, to, firstDataRequest);
		
		if (!firstDataRequest) {
			return
		}
	  try {
			const { data } = await getHisotricCandlesticks()
			if (!data) {
				onHistoryCallback([], { noData: true });
			}

			const bars: Bar[] = data
				.filter(([time]) => time / 1000 >= from && time / 1000 < to)
				.map(([time, open, close, high, low]) => {
					return ({ 
						time,
						open: parseInt(open, 10),
						close: parseInt(close, 10),
						high: parseInt(high, 10),
						low: parseInt(low, 10)
					})
				})

			if (firstDataRequest) {
				lastBarCache = bars[bars.length - 1]
			}
		  console.log(`[getBars]: returned ${bars.length} bar(s)`);
		  onHistoryCallback(bars, { noData: false });
	  } catch (error) {
		  console.log('[getBars]: Get error', error);
		  onErrorCallback(error);
	  }
	},
  subscribeBars: (symbolInfo, resolution, onRealtimeCallback, subscribeUID) => {
		console.log('[subscribeBars]: Method call with subscribeUID:', subscribeUID);
		subscribeOnStream(onRealtimeCallback, lastBarCache);
	},
	unsubscribeBars: (subscriberUID) => {
		console.log('[unsubscribeBars]: Method call with subscriberUID:', subscriberUID);
		unsubscribeFromStream();
	},
  }
  