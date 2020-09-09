import dayjs from 'dayjs';
import { SERVER_URL } from 'public/constants';
import { Bar, SubscribeBarsCallback } from 'shared/chartingLibrary/charting_library.min';

const socket = new WebSocket(`ws://${SERVER_URL}/transactionHistory`);

function initSocket(onRealtimeCallback: SubscribeBarsCallback, lastBarCache: Bar) {
  /**
   * 마지막으로 캔들스틱 그래프에 반영된 거래내역 시간
   */
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
    
    /**
     * 다음 캔들스틱이 시작해야할 시간
     */
    const nextBarTime = dayjs(lastBarCache.time).add(1, 'minute').startOf('minute')

    /**
     * 현 캔들스틱에 반영될 1분 내외의 거래내역들
     * 마지막 캔들스틱 시작시간 이후이자 마지막 거래내역 이후이며, 다음 캔들스틱보다 이전이여야 함.
     * 주의: 1분 내외 거래내역이 존재하지 않지만, 2분후의 거래내역이 존재할 수 있다. 그래서 다음 nextTransactions 를 사용
     */
    let newTransactions = data.filter(({ transaction_date }) => {
      const dateValue = dayjs(transaction_date).valueOf()
      return (
        dateValue >= dayjs(lastBarCache.time).valueOf() &&
        dateValue > lastlyCheckedTransactionDate.valueOf() &&
        dateValue < nextBarTime.valueOf()
      )
    })

    /**
     * 바로 다음 캔들스틱에 대한 거래내역이 없다면, 다음 2번째 캔들스틱에 반영하기 위한 거래내역들
     */
    const nextTransactions = data.filter(({transaction_date}) => {
      return dayjs(transaction_date).valueOf() >= nextBarTime.valueOf()
    })

    if (newTransactions.length === 0 && nextTransactions.length === 0) {
      // 신규 거래내역이 없음
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

    newTransactions.sort((a, b) => dayjs(a.transaction_date).valueOf() - dayjs(b.transaction_date).valueOf())

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
