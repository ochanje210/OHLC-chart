import { SubscribeBarsCallback, Bar } from 'shared/chartingLibrary/charting_library.min';
import dayjs from 'dayjs'

const socket = new WebSocket('ws://localhost:10000/transactionHistory');

function initSocket(onRealtimeCallback: SubscribeBarsCallback, lastBarCache: Bar) {
  let lastlyCheckedTransactionDate = dayjs(-1);

  socket.addEventListener('open', () => {
    console.log('[socket] Opened');
  })
  socket.addEventListener('close', () => {
    console.log('[socket] Closed');
  })
  socket.addEventListener('error', (error) => {
    console.log('[socket] Error:', error);
  })
  socket.addEventListener('message', (message) => {
    console.log('[socket] Message received');

    const { data } = JSON.parse(message.data) as { data: History[] }
    
    const nextBarTime = dayjs(lastBarCache.time).add(1, 'minute').startOf('minute')
    let newTransactions = data.filter(({ transaction_date }) => {
      const dateValue = dayjs(transaction_date).valueOf()
      return (
        dateValue >= dayjs(lastBarCache.time).valueOf() &&
        dateValue > lastlyCheckedTransactionDate.valueOf() &&
        dateValue < nextBarTime.valueOf()
      )
    })

    const nextTransactions = data.filter(({transaction_date}) => {
      return dayjs(transaction_date).valueOf() >= nextBarTime.valueOf()
    })

    newTransactions.sort((a, b) => dayjs(a.transaction_date).valueOf() - dayjs(b.transaction_date).valueOf())

    if (newTransactions.length === 0 && nextTransactions.length === 0) {
      // 신규 거래내역이 없음
      console.log({ data, 
        lastbarcache: dayjs(lastBarCache.time).format('hh:mm:ss'),
        lastlyCheckedTransactionDate: lastlyCheckedTransactionDate.format('hh:mm:ss'), 
        nextBarTime: nextBarTime.format('hh:mm:ss') })
      return
    }
    if (newTransactions.length === 0 && nextTransactions.length > 0) {
      // 바로 다음 1분후에는 거래내역이 없고, 그 이후에 거래내역이 존재
      const firstDate = dayjs(nextTransactions[0].transaction_date)
      const nextNextBarTime = firstDate.add(1, 'minute').startOf('minute')

      newTransactions = nextTransactions.filter(({ transaction_date }) => {
        return dayjs(transaction_date).isBefore(nextNextBarTime)
      })
    }

    lastlyCheckedTransactionDate = dayjs(newTransactions[newTransactions.length - 1].transaction_date)

    const highLowData = newTransactions.reduce((acc, cur) => ({
      high: Math.max(acc.high, parseInt(cur.price)),
      low: Math.min(acc.low, parseInt(cur.price))
    }), { high: 0, low: parseInt(newTransactions[0].price) })
    
    const startDate = dayjs(newTransactions[0].transaction_date)
    const open = parseInt(newTransactions[0].price)
    const close = parseInt(newTransactions[newTransactions.length - 1].price)

    let bar: Bar;
    const shouldDrawNewCandlestick = startDate.valueOf() >= nextBarTime.startOf('minute').valueOf()
    if (shouldDrawNewCandlestick) {
      console.log('new bar created!')
      // 새로운 캔들스틱을 그려야함
      bar = {
        time: startDate.startOf('minute').valueOf(),
        open,
        high: highLowData.high,
        low: highLowData.low,
        close,
      }
    } else {
      console.log('last bar updated')
      // 기존의 마지막 캔들스틱 업데이트
      bar = {
        ...lastBarCache,
        high: Math.max(lastBarCache.high, highLowData.high),
        low: Math.min(lastBarCache.low, highLowData.low),
        close,
      }
    }

    lastBarCache = bar
    onRealtimeCallback(bar)
  })
}

interface History {
  price: string;
  total: string;
  transaction_date: string;
  type: "ask" | "bid";
  units_traded: string
}

export function subscribeOnStream(onRealtimeCallback: SubscribeBarsCallback, lastBarCache: Bar) {
  initSocket(onRealtimeCallback, lastBarCache)
}

export function unsubscribeFromStream() {
  socket.close()
}
