import { SubscribeBarsCallback, Bar } from 'shared/chartingLibrary/charting_library.min';
import dayjs from 'dayjs'

const socket = new WebSocket('ws://localhost:10000/transactionHistory'); // streamer.cryptocompare.com

socket.addEventListener('open', () => {
  console.log('[socket] Opened');
})
socket.addEventListener('close', () => {
  console.log('[socket] Closed');
})
socket.addEventListener('error', (error) => {
  console.log('[socket] Error:', error);
})

let lastBar: Bar

interface History {
  price: string;
  total: string;
  transaction_date: string;
  type: "ask" | "bid";
  units_traded: string
}

export function subscribeOnStream(onRealtimeCallback: SubscribeBarsCallback, lastBarCache: Bar) {
  socket.addEventListener('message', (message) => {
    // 기준시간~시가~종가~고가~저가
    const { data } = JSON.parse(message.data) as { data: History[] }
    console.log('[socket] Message:');

    const newTransactions = lastBar ?
        data.filter(({ transaction_date }) => dayjs(transaction_date).isAfter(dayjs(lastBar.time)))
      : data

    lastBar = {
      ...lastBar,
      time: dayjs().valueOf(),
      open: newTransactions.reduce((acc ,cur) => acc + parseInt(cur.total),0)
    }

    onRealtimeCallback(lastBar)
  })
}

export function unsubscribeFromStream() {
  socket.close()
}
