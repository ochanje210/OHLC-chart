package main

import (
	"io"
	"io/ioutil"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
)

var historicCandlestick []byte
var last1MinTransaction []byte

var upgrader = websocket.Upgrader{}

var allowedOrigins = [2]string{"http://localhost:3000", "http://13.125.151.218:3000"}

func keepFetchingHistoricCandlestick() {
	for {
		resp, err := http.Get("https://api.bithumb.com/public/candlestick/BTC_KRW/1m")
		if err != nil {
			log.Fatalln(err)
		}

		defer resp.Body.Close()

		body, err := ioutil.ReadAll(resp.Body)
		if err != nil {
			log.Fatalln(err)
		}
		historicCandlestick = body
		log.Println("historic candlesticks updated with length", len(historicCandlestick))

		time.Sleep(1 * time.Minute)
	}
}
func keepFetchingTransactionHistory() {
	for {
		resp, err := http.Get("https://api.bithumb.com/public/transaction_history/BTC_KRW")
		if err != nil {
			log.Fatalln(err)
		}

		defer resp.Body.Close()

		body, err := ioutil.ReadAll(resp.Body)
		if err != nil {
			log.Fatalln(err)
		}
		last1MinTransaction = body

		time.Sleep(1 * time.Second)
	}
}

func isAllowedOrigin(r *http.Request) bool {
	origin := r.Header["Origin"]
	for _, allowedOrigin := range allowedOrigins {
		if allowedOrigin == origin[0] {
			return true
		}
	}
	return false
}

func transactionHistoryHandler(w http.ResponseWriter, r *http.Request) {
	setCORS(w, r)

	upgrader.CheckOrigin = func(r *http.Request) bool {
		return isAllowedOrigin(r)
	}

	c, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Print("upgrade:", err)
		return
	}
	defer c.Close()
	for {
		time.Sleep(1 * time.Second)

		err = c.WriteMessage(1, last1MinTransaction)
		if err != nil {
			log.Println("write:", err)
			break
		}
	}
}

func setCORS(w http.ResponseWriter, req *http.Request) {
	if isAllowedOrigin(req) {
		origin := req.Header["Origin"]
		w.Header().Set("Access-Control-Allow-Origin", origin[0])
		w.Header().Set("Access-Control-Allow-Credentials", "true")
	}
}

func handleRequests() {
	mux := http.NewServeMux()

	mux.HandleFunc("/health", func(w http.ResponseWriter, req *http.Request) {
		io.WriteString(w, "OK")
	})
	mux.HandleFunc("/historic", func(w http.ResponseWriter, req *http.Request) {
		setCORS(w, req)
		w.Write(historicCandlestick)
	})
	mux.HandleFunc("/transactionHistory", transactionHistoryHandler)

	log.Fatal(http.ListenAndServe(":10000", mux))
}

func main() {
	go keepFetchingHistoricCandlestick()
	go keepFetchingTransactionHistory()
	handleRequests()
}
